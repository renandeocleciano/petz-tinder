import { z } from 'zod';

import type { MessageRow } from '../../database/schema/index.js';
import { decodeCursor, encodeCursor } from '../../shared/utils/cursor.js';
import type { MediaService } from '../media/media.service.js';
import { BUCKETS } from '../media/media.types.js';
import { PetForbiddenError, PetNotFoundError, PetSuspendedError } from '../pets/pets.errors.js';
import { createPetPresenter } from '../pets/pets.presenter.js';
import type { PetsRepository } from '../pets/pets.repository.js';
import {
  ConversationNotFoundError,
  MessageNotFoundError,
  OwnPlaydateError,
  PlaydateAlreadyAnsweredError,
} from './conversations.errors.js';
import type { ConversationsRepository } from './conversations.repository.js';
import type {
  ConversationDetailDto,
  ConversationSummaryDto,
  MessageDto,
  PlaydateSummaryDto,
  SendMessageBody,
} from './conversations.schemas.js';
import {
  MESSAGE_CREATED,
  PLAYDATE_ANSWERED,
  type ConversationView,
  type PlaydateStatus,
} from './conversations.types.js';

interface Deps {
  repository: ConversationsRepository;
  petsRepository: PetsRepository;
  media: MediaService;
  now?: () => Date;
}

const cursorSchema = z.tuple([z.string().min(1).max(64), z.uuid()]);
/** "Meus passeios" shows upcoming invites and the last 30 days. */
const PLAYDATE_HISTORY_DAYS = 30;
const MAX_PLAYDATES = 100;
const CHAT_BUCKET = BUCKETS.chat_media;
/** Venue coordinates are kept to ~10 m: enough to find a park, not more. */
const roundVenue = (value: number) => Math.round(value * 10_000) / 10_000;

const decode = (cursor: string | undefined) => {
  if (!cursor) return undefined;
  const [at, id] = decodeCursor(cursorSchema, cursor);
  return { at, id };
};

export const createConversationsService = ({
  repository,
  petsRepository,
  media,
  now = () => new Date(),
}: Deps) => {
  const presentPet = createPetPresenter({ publicUrl: media.publicUrl, now });

  /** Whoever did not send the message decides its read time. */
  const readAt = (message: MessageRow, view: ConversationView) => {
    const reader = message.senderPetId === view.myPetId ? view.otherLastReadAt : view.myLastReadAt;
    return reader && reader >= message.createdAt ? reader.toISOString() : null;
  };

  const presentMessages = async (rows: MessageRow[], view: ConversationView) => {
    const paths = rows.flatMap((row) => (row.imagePath ? [row.imagePath] : []));
    const urls = await media.signedUrls(CHAT_BUCKET, paths);
    return rows.map((row): MessageDto => ({
      id: row.id,
      conversationId: row.conversationId,
      senderPetId: row.senderPetId,
      senderUserId: row.senderUserId,
      type: row.type,
      text: row.text,
      imageUrl: (row.imagePath && urls.get(row.imagePath)) || null,
      playdate:
        row.playdate && row.playdateStatus ? { ...row.playdate, status: row.playdateStatus } : null,
      createdAt: row.createdAt.toISOString(),
      readAt: readAt(row, view),
    }));
  };

  const loadPets = async (ids: string[]) => {
    const records = await petsRepository.findByIds(ids);
    return new Map((await petsRepository.hydrate(records)).map((pet) => [pet.id, presentPet(pet)]));
  };

  const findVisible = async (userId: string, conversationId: string) => {
    const view = await repository.findForUser(userId, conversationId);
    if (!view) throw new ConversationNotFoundError();
    return view;
  };

  return {
    async list(
      userId: string,
      query: { petId?: string | undefined; cursor?: string | undefined; limit: number },
    ): Promise<{ data: ConversationSummaryDto[]; nextCursor: string | null }> {
      const after = decode(query.cursor);
      if (query.petId) {
        const pet = await petsRepository.findById(query.petId);
        if (!pet) throw new PetNotFoundError();
        if (pet.ownerId !== userId) throw new PetForbiddenError();
      }
      const views = await repository.listForUser({
        userId,
        petId: query.petId,
        after,
        limit: query.limit + 1,
      });
      const page = views.slice(0, query.limit);
      const last = page.at(-1);

      const [pets, lastMessages] = await Promise.all([
        loadPets(page.map((view) => view.otherPetId)),
        repository.findMessagesByIds(page.flatMap((view) => view.lastMessageId ?? [])),
      ]);
      const messagesById = new Map(lastMessages.map((row) => [row.id, row]));

      const data = await Promise.all(
        page.map(async (view) => {
          const pet = pets.get(view.otherPetId);
          if (!pet) return [];
          const lastRow = view.lastMessageId ? messagesById.get(view.lastMessageId) : undefined;
          const [lastMessage] = lastRow ? await presentMessages([lastRow], view) : [];
          return [
            {
              id: view.id,
              matchId: view.matchId,
              myPetId: view.myPetId,
              pet,
              lastMessage: lastMessage ?? null,
              unreadCount: view.unreadCount,
              updatedAt: view.activityAt.toISOString(),
            },
          ];
        }),
      );
      return {
        data: data.flat(),
        nextCursor:
          views.length > query.limit && last ? encodeCursor([last.activityAtExact, last.id]) : null,
      };
    },

    async get(userId: string, conversationId: string): Promise<ConversationDetailDto> {
      const view = await findVisible(userId, conversationId);
      const pets = await loadPets([view.myPetId, view.otherPetId]);
      const myPet = pets.get(view.myPetId);
      const pet = pets.get(view.otherPetId);
      if (!myPet || !pet) throw new ConversationNotFoundError();
      return { id: view.id, matchId: view.matchId, myPet, pet, unreadCount: view.unreadCount };
    },

    async listMessages(
      userId: string,
      conversationId: string,
      query: { cursor?: string | undefined; limit: number },
    ): Promise<{ data: MessageDto[]; nextCursor: string | null }> {
      const after = decode(query.cursor);
      const view = await findVisible(userId, conversationId);
      const rows = await repository.listMessages(conversationId, {
        after,
        limit: query.limit + 1,
      });
      const page = rows.slice(0, query.limit);
      const last = page.at(-1);
      return {
        data: await presentMessages(page, view),
        nextCursor:
          rows.length > query.limit && last ? encodeCursor([last.createdAtExact, last.id]) : null,
      };
    },

    /**
     * Writes always go through the API (rules, blocks, rate limit). The message, the
     * conversation activity and the MessageCreated outbox event commit together.
     */
    async send(userId: string, conversationId: string, body: SendMessageBody): Promise<MessageDto> {
      const view = await findVisible(userId, conversationId);
      if (view.myPetStatus === 'suspended') throw new PetSuspendedError();
      if (body.type === 'image') await media.assertUploaded(userId, CHAT_BUCKET, body.imagePath);

      const message = await repository.transaction(async (tx) => {
        const row = await tx.insertMessage({
          conversationId,
          senderPetId: view.myPetId,
          senderUserId: userId,
          type: body.type,
          text: body.text ?? null,
          imagePath: body.type === 'image' ? body.imagePath : null,
          playdate:
            body.type === 'playdate_invite'
              ? {
                  placeName: body.playdate.placeName,
                  latitude: roundVenue(body.playdate.latitude),
                  longitude: roundVenue(body.playdate.longitude),
                  scheduledAt: new Date(body.playdate.scheduledAt).toISOString(),
                }
              : null,
          playdateStatus: body.type === 'playdate_invite' ? 'pending' : null,
        });
        await tx.touch(conversationId, view.myPetId, row.id);
        await tx.enqueueEvent(MESSAGE_CREATED, {
          conversationId,
          messageId: row.id,
          type: row.type,
          senderUserId: userId,
          senderPetId: view.myPetId,
          recipientUserId: view.otherUserId,
        });
        return row;
      });
      const [dto] = await presentMessages([message], view);
      if (!dto) throw new MessageNotFoundError();
      return dto;
    },

    /** The user's playdates across conversations: upcoming and the last 30 days. */
    async listPlaydates(
      userId: string,
      query: { petId?: string | undefined },
    ): Promise<PlaydateSummaryDto[]> {
      if (query.petId) {
        const pet = await petsRepository.findById(query.petId);
        if (!pet) throw new PetNotFoundError();
        if (pet.ownerId !== userId) throw new PetForbiddenError();
      }
      const views = await repository.listPlaydates(userId, {
        petId: query.petId,
        since: new Date(now().getTime() - PLAYDATE_HISTORY_DAYS * 86_400_000),
        limit: MAX_PLAYDATES,
      });
      const pets = await loadPets(views.map((view) => view.otherPetId));
      return views.flatMap(({ message, myPetId, otherPetId }) => {
        const pet = pets.get(otherPetId);
        if (!pet || !message.playdate || !message.playdateStatus) return [];
        return [
          {
            id: message.id,
            conversationId: message.conversationId,
            myPetId,
            pet,
            direction: message.senderPetId === myPetId ? ('sent' as const) : ('received' as const),
            ...message.playdate,
            status: message.playdateStatus,
            createdAt: message.createdAt.toISOString(),
          },
        ];
      });
    },

    async markRead(userId: string, conversationId: string): Promise<void> {
      const view = await findVisible(userId, conversationId);
      await repository.markRead(conversationId, view.myPetId);
    },

    async answerPlaydate(
      userId: string,
      conversationId: string,
      messageId: string,
      status: Exclude<PlaydateStatus, 'pending'>,
    ): Promise<MessageDto> {
      const view = await findVisible(userId, conversationId);
      const message = await repository.findMessage(conversationId, messageId);
      if (!message || message.type !== 'playdate_invite') throw new MessageNotFoundError();
      if (message.senderPetId === view.myPetId) throw new OwnPlaydateError();

      const updated = await repository.transaction(async (tx) => {
        const row = await tx.answerPlaydate(conversationId, messageId, status);
        if (!row) throw new PlaydateAlreadyAnsweredError();
        await tx.enqueueEvent(PLAYDATE_ANSWERED, {
          conversationId,
          messageId,
          status,
          answeredByUserId: userId,
          recipientUserId: view.otherUserId,
        });
        return row;
      });
      const [dto] = await presentMessages([updated], view);
      if (!dto) throw new MessageNotFoundError();
      return dto;
    },
  };
};

export type ConversationsService = ReturnType<typeof createConversationsService>;
