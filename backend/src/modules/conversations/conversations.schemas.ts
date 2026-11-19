import { z } from 'zod';

import {
  MAX_MESSAGE_LENGTH,
  MESSAGE_TYPES,
  PLAYDATE_STATUSES,
} from '../../database/schema/index.js';
import { storagePathSchema } from '../media/media.schemas.js';
import { petSchema } from '../pets/pets.schemas.js';

/** Invites can be scheduled up to this far ahead. */
export const MAX_PLAYDATE_DAYS_AHEAD = 90;

const caption = z.string().trim().min(1).max(MAX_MESSAGE_LENGTH).optional();

const playdateInputSchema = z
  .object({
    placeName: z.string().trim().min(1).max(120),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    scheduledAt: z.iso.datetime({ offset: true }),
  })
  .strict()
  .refine(
    ({ scheduledAt }) => {
      const at = new Date(scheduledAt).getTime();
      return at > Date.now() && at < Date.now() + MAX_PLAYDATE_DAYS_AHEAD * 86_400_000;
    },
    {
      message: `A data do passeio deve estar nos próximos ${MAX_PLAYDATE_DAYS_AHEAD} dias`,
      path: ['scheduledAt'],
    },
  );

export const sendMessageBodySchema = z.discriminatedUnion('type', [
  z
    .object({ type: z.literal('text'), text: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH) })
    .strict(),
  z
    .object({
      type: z.literal('image'),
      /** Path returned by POST /v1/media/upload-url (purpose `chat_media`). */
      imagePath: storagePathSchema,
      text: caption,
    })
    .strict(),
  z
    .object({ type: z.literal('playdate_invite'), playdate: playdateInputSchema, text: caption })
    .strict(),
]);

export const answerPlaydateBodySchema = z
  .object({ status: z.enum(['accepted', 'declined']) })
  .strict();

export const conversationIdParamsSchema = z.object({ id: z.uuid() });
export const messageParamsSchema = z.object({ id: z.uuid(), messageId: z.uuid() });

const page = (max: number, fallback: number) => ({
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(max).default(fallback),
});

export const listConversationsQuerySchema = z.object({
  /** Only conversations of this pet (must be the caller's). */
  petId: z.uuid().optional(),
  ...page(50, 20),
});

export const listMessagesQuerySchema = z.object(page(100, 30));

export const messageSchema = z
  .object({
    id: z.uuid(),
    conversationId: z.uuid(),
    senderPetId: z.uuid(),
    senderUserId: z.uuid(),
    type: z.enum(MESSAGE_TYPES),
    text: z.string().nullable(),
    /** Signed, temporary URL (private bucket). */
    imageUrl: z.url().nullable(),
    playdate: z
      .object({
        placeName: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        scheduledAt: z.iso.datetime({ offset: true }),
        status: z.enum(PLAYDATE_STATUSES),
      })
      .nullable(),
    createdAt: z.iso.datetime(),
    /** When the recipient read it; null while unread. */
    readAt: z.iso.datetime().nullable(),
  })
  .meta({ id: 'Message' });

export const conversationSummarySchema = z
  .object({
    id: z.uuid(),
    matchId: z.uuid().nullable(),
    myPetId: z.uuid(),
    pet: petSchema,
    lastMessage: messageSchema.nullable(),
    unreadCount: z.number().int(),
    updatedAt: z.iso.datetime(),
  })
  .meta({ id: 'ConversationSummary' });

export const conversationDetailSchema = z
  .object({
    id: z.uuid(),
    matchId: z.uuid().nullable(),
    myPet: petSchema,
    pet: petSchema,
    unreadCount: z.number().int(),
  })
  .meta({ id: 'ConversationDetail' });

export const conversationListResponseSchema = z.object({
  data: z.array(conversationSummarySchema),
  nextCursor: z.string().nullable(),
});
export const conversationResponseSchema = z.object({ conversation: conversationDetailSchema });
export const messageListResponseSchema = z.object({
  data: z.array(messageSchema),
  nextCursor: z.string().nullable(),
});
export const messageResponseSchema = z.object({ message: messageSchema });

export const listPlaydatesQuerySchema = z.object({
  /** Only invites involving this pet (must be the caller's). */
  petId: z.uuid().optional(),
});

export const playdateSummarySchema = z
  .object({
    /** The invite message id (answer it with PATCH .../messages/:messageId/playdate). */
    id: z.uuid(),
    conversationId: z.uuid(),
    myPetId: z.uuid(),
    /** The other pet. */
    pet: petSchema,
    /** `sent` when the caller's pet invited. */
    direction: z.enum(['sent', 'received']),
    placeName: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    scheduledAt: z.iso.datetime({ offset: true }),
    status: z.enum(PLAYDATE_STATUSES),
    createdAt: z.iso.datetime(),
  })
  .meta({ id: 'PlaydateSummary' });

export const playdateListResponseSchema = z.object({ data: z.array(playdateSummarySchema) });

export type SendMessageBody = z.output<typeof sendMessageBodySchema>;
export type PlaydateSummaryDto = z.output<typeof playdateSummarySchema>;
export type MessageDto = z.output<typeof messageSchema>;
export type ConversationSummaryDto = z.output<typeof conversationSummarySchema>;
export type ConversationDetailDto = z.output<typeof conversationDetailSchema>;
