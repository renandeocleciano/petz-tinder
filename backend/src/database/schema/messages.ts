import { sql } from 'drizzle-orm';
import { check, index, jsonb, pgEnum, pgTable, text, uuid, varchar } from 'drizzle-orm/pg-core';

import { id, timestamps } from './columns.js';
import { conversations } from './matches.js';
import { pets } from './pets.js';
import { users } from './users.js';

export const MESSAGE_TYPES = ['text', 'image', 'playdate_invite'] as const;
export const PLAYDATE_STATUSES = ['pending', 'accepted', 'declined'] as const;
export const MAX_MESSAGE_LENGTH = 2000;

export const messageType = pgEnum('message_type', MESSAGE_TYPES);
export const playdateStatus = pgEnum('playdate_status', PLAYDATE_STATUSES);

/** A public place proposed for a playdate. Never the tutor's own location. */
export interface PlaydateDetails {
  placeName: string;
  latitude: number;
  longitude: number;
  scheduledAt: string;
}

export const messages = pgTable(
  'messages',
  {
    id: id(),
    conversationId: uuid()
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    senderPetId: uuid()
      .notNull()
      .references(() => pets.id, { onDelete: 'cascade' }),
    /** Denormalized for RLS (Realtime) and push routing. */
    senderUserId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: messageType().notNull(),
    /** Body for `text`, optional caption for `image` and `playdate_invite`. */
    text: varchar({ length: MAX_MESSAGE_LENGTH }),
    /** Object path in the private `chat-media` bucket. */
    imagePath: text(),
    playdate: jsonb().$type<PlaydateDetails>(),
    playdateStatus: playdateStatus(),
    ...timestamps,
  },
  (table) => [
    index().on(table.conversationId, table.createdAt),
    check(
      'messages_payload_matches_type',
      sql`case ${table.type}
        when 'text' then ${table.text} is not null
        when 'image' then ${table.imagePath} is not null
        when 'playdate_invite' then ${table.playdate} is not null and ${table.playdateStatus} is not null
      end`,
    ),
  ],
).enableRLS();

export type MessageRow = typeof messages.$inferSelect;
export type NewMessageRow = typeof messages.$inferInsert;
