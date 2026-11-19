import type { FastifyBaseLogger } from 'fastify';
import { z } from 'zod';

import type { MessageRow } from '../../database/schema/index.js';
import { MESSAGE_CREATED, PLAYDATE_ANSWERED } from '../conversations/conversations.types.js';
import { MATCH_CREATED } from '../likes/likes.types.js';
import { PermanentEventError, type OutboxHandler } from '../outbox/outbox.worker.js';
import type { NotificationsRepository } from './notifications.repository.js';
import type { PushMessage, PushSender } from './push.sender.js';

interface Deps {
  repository: NotificationsRepository;
  sender: PushSender;
  /** Pet names by id (deleted pets are simply missing). */
  petNames: (petIds: string[]) => Promise<Map<string, string>>;
  areBlocked: (userA: string, userB: string) => Promise<boolean>;
  findMessage: (messageId: string) => Promise<MessageRow | undefined>;
  logger: FastifyBaseLogger;
  now?: () => Date;
}

const RECEIPT_DELAY_MS = 15 * 60 * 1000;
/** Expo keeps receipts for about a day; older tickets are dropped unchecked. */
const RECEIPT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const PREVIEW_LENGTH = 120;

const matchCreated = z.object({
  matchId: z.uuid(),
  conversationId: z.uuid(),
  petIds: z.tuple([z.uuid(), z.uuid()]),
  userIds: z.tuple([z.uuid(), z.uuid()]),
});
const messageCreated = z.object({
  conversationId: z.uuid(),
  messageId: z.uuid(),
  senderUserId: z.uuid(),
  senderPetId: z.uuid(),
  recipientUserId: z.uuid(),
});
const playdateAnswered = z.object({
  conversationId: z.uuid(),
  messageId: z.uuid(),
  status: z.enum(['accepted', 'declined']),
  answeredByUserId: z.uuid(),
  recipientUserId: z.uuid(),
});

const parse = <T extends z.ZodType>(schema: T, payload: unknown): z.output<T> => {
  const result = schema.safeParse(payload);
  if (!result.success) throw new PermanentEventError('Invalid event payload');
  return result.data;
};

const preview = (text: string) =>
  text.length > PREVIEW_LENGTH ? `${text.slice(0, PREVIEW_LENGTH - 1)}…` : text;

const messageBody = (message: MessageRow) => {
  if (message.type === 'image') return message.text ? `📷 ${preview(message.text)}` : '📷 Foto';
  if (message.type === 'playdate_invite') {
    return `📅 Convite para passear${message.playdate ? ` no ${message.playdate.placeName}` : ''}`;
  }
  return preview(message.text ?? '');
};

/**
 * Turns domain events into Expo pushes. Content is written in pt-BR. Nothing here runs
 * inside the transaction that produced the event.
 */
export const createNotificationsService = ({
  repository,
  sender,
  petNames,
  areBlocked,
  findMessage,
  logger,
  now = () => new Date(),
}: Deps) => {
  /** Sends one push per device of each user; prunes tokens Expo rejects right away. */
  const notify = async (userId: string, content: Omit<PushMessage, 'to'>): Promise<void> => {
    const tokens = (await repository.tokensFor([userId])).map((row) => row.token);
    const invalid = tokens.filter((token) => !sender.isValidToken(token));
    const valid = tokens.filter((token) => sender.isValidToken(token));
    await repository.deleteTokens(invalid);
    if (valid.length === 0) return;

    const tickets = await sender.send(valid.map((to) => ({ to, ...content })));
    const receipts: { ticketId: string; token: string }[] = [];
    const unregistered: string[] = [];
    tickets.forEach((ticket, index) => {
      const token = valid[index];
      if (!token) return;
      if (ticket.status === 'ok') receipts.push({ ticketId: ticket.id, token });
      else if (ticket.details?.error === 'DeviceNotRegistered') unregistered.push(token);
      else logger.warn({ error: ticket.details?.error }, 'Push ticket error');
    });
    await repository.saveReceipts(receipts);
    await repository.deleteTokens(unregistered);
  };

  const handlers: Record<string, OutboxHandler> = {
    async [MATCH_CREATED](payload) {
      const { matchId, conversationId, petIds, userIds } = parse(matchCreated, payload);
      const names = await petNames(petIds);
      await Promise.all(
        ([0, 1] as const).map((mine) => {
          const other = mine === 0 ? 1 : 0;
          const myPet = names.get(petIds[mine]);
          const otherPet = names.get(petIds[other]);
          if (!myPet || !otherPet) return undefined;
          return notify(userIds[mine], {
            title: 'Deu match! 🐾',
            body: `${otherPet} e ${myPet} deram match. Que tal combinar um passeio?`,
            data: { type: 'match', matchId, conversationId },
          });
        }),
      );
    },

    async [MESSAGE_CREATED](payload) {
      const event = parse(messageCreated, payload);
      if (await areBlocked(event.senderUserId, event.recipientUserId)) return;
      const message = await findMessage(event.messageId);
      if (!message) return; // conversation was removed (unmatch) before delivery
      const sender = (await petNames([event.senderPetId])).get(event.senderPetId);
      await notify(event.recipientUserId, {
        title: sender ?? 'Nova mensagem',
        body: messageBody(message),
        data: { type: 'message', conversationId: event.conversationId, messageId: message.id },
      });
    },

    async [PLAYDATE_ANSWERED](payload) {
      const event = parse(playdateAnswered, payload);
      if (await areBlocked(event.answeredByUserId, event.recipientUserId)) return;
      const message = await findMessage(event.messageId);
      if (!message) return;
      const place = message.playdate ? ` no ${message.playdate.placeName}` : '';
      await notify(event.recipientUserId, {
        title: 'Convite para passear',
        body:
          event.status === 'accepted'
            ? `Seu convite${place} foi aceito! 🎉`
            : `Seu convite${place} foi recusado.`,
        data: {
          type: 'playdate',
          conversationId: event.conversationId,
          messageId: event.messageId,
          status: event.status,
        },
      });
    },
  };

  /**
   * Reads Expo receipts (~15 min after sending) and deletes tokens of uninstalled apps.
   * Returns how many tickets were settled.
   */
  const checkReceipts = async (limit = 1000): Promise<number> => {
    const due = await repository.receiptsBefore(
      new Date(now().getTime() - RECEIPT_DELAY_MS),
      limit,
    );
    if (due.length === 0) return 0;
    const receipts = await sender.receipts(due.map((row) => row.ticketId));
    const expiredBefore = now().getTime() - RECEIPT_MAX_AGE_MS;
    const settled: string[] = [];
    const unregistered: string[] = [];
    for (const row of due) {
      const receipt = receipts[row.ticketId];
      if (!receipt) {
        // Not ready yet; give up once Expo no longer keeps it.
        continue;
      }
      settled.push(row.ticketId);
      if (receipt.status === 'error') {
        if (receipt.details?.error === 'DeviceNotRegistered') unregistered.push(row.token);
        else logger.warn({ error: receipt.details?.error }, 'Push receipt error');
      }
    }
    const stale = await repository.receiptsBefore(new Date(expiredBefore), limit);
    await repository.deleteTokens(unregistered);
    await repository.deleteReceipts([...settled, ...stale.map((row) => row.ticketId)]);
    return settled.length;
  };

  return { handlers, checkReceipts, notify };
};

export type NotificationsService = ReturnType<typeof createNotificationsService>;
