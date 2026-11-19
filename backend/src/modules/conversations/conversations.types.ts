import type { MessageRow, PET_STATUSES, PLAYDATE_STATUSES } from '../../database/schema/index.js';

export type PlaydateStatus = (typeof PLAYDATE_STATUSES)[number];

/** A conversation seen from one user's side. */
export interface ConversationView {
  id: string;
  matchId: string | null;
  /** Last message time (or creation), exact Postgres text: used for cursors. */
  activityAtExact: string;
  activityAt: Date;
  myPetId: string;
  myPetStatus: (typeof PET_STATUSES)[number];
  otherPetId: string;
  otherUserId: string;
  myLastReadAt: Date | null;
  otherLastReadAt: Date | null;
  lastMessageId: string | null;
  unreadCount: number;
}

export interface Cursor {
  at: string;
  id: string;
}

export interface ListConversationsQuery {
  userId: string;
  petId?: string | undefined;
  after?: Cursor | undefined;
  limit: number;
}

export type MessageRecord = MessageRow & { createdAtExact: string };

/** A playdate invite (a `playdate_invite` message) seen from one user's side. */
export interface PlaydateView {
  message: MessageRow;
  myPetId: string;
  otherPetId: string;
}

/** Outbox event types written by this module. */
export const MESSAGE_CREATED = 'MessageCreated';
export const PLAYDATE_ANSWERED = 'PlaydateAnswered';
