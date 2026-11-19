import {
  and,
  asc,
  desc,
  eq,
  exists,
  getTableColumns,
  inArray,
  lt,
  ne,
  notExists,
  or,
  sql,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import type { Database, DbExecutor } from '../../database/index.js';
import {
  blocks,
  conversationParticipants,
  conversations,
  messages,
  outboxEvents,
  pets,
  type MessageRow,
  type NewMessageRow,
} from '../../database/schema/index.js';
import type {
  ConversationView,
  Cursor,
  ListConversationsQuery,
  MessageRecord,
  PlaydateStatus,
  PlaydateView,
} from './conversations.types.js';

export interface ConversationsRepository {
  /** Runs `fn` atomically; nested calls reuse the outer transaction. */
  transaction<T>(fn: (repository: ConversationsRepository) => Promise<T>): Promise<T>;
  /** Conversations of the user's pets, most recent activity first. */
  listForUser(query: ListConversationsQuery): Promise<ConversationView[]>;
  findForUser(userId: string, conversationId: string): Promise<ConversationView | undefined>;
  /** Newest first. */
  listMessages(
    conversationId: string,
    page: { after?: Cursor | undefined; limit: number },
  ): Promise<MessageRecord[]>;
  findMessagesByIds(ids: string[]): Promise<MessageRow[]>;
  findMessage(conversationId: string, messageId: string): Promise<MessageRow | undefined>;
  insertMessage(values: NewMessageRow): Promise<MessageRow>;
  /** Bumps the conversation activity and marks the sender as having read up to it. */
  touch(conversationId: string, senderPetId: string, messageId: string): Promise<void>;
  markRead(conversationId: string, petId: string): Promise<void>;
  /** Answers a pending invite; undefined when it is not pending (or does not exist). */
  answerPlaydate(
    conversationId: string,
    messageId: string,
    status: PlaydateStatus,
  ): Promise<MessageRow | undefined>;
  enqueueEvent(type: string, payload: Record<string, unknown>): Promise<void>;
  /**
   * Playdate invites in the user's visible conversations, scheduled since `since`, soonest
   * first. Same visibility as conversations (no blocks, other pet not suspended).
   */
  listPlaydates(
    userId: string,
    query: { petId?: string | undefined; since: Date; limit: number },
  ): Promise<PlaydateView[]>;
}

const me = alias(conversationParticipants, 'me');
const other = alias(conversationParticipants, 'other');
const myPet = alias(pets, 'my_pet');
const otherPet = alias(pets, 'other_pet');

/**
 * Correlated subqueries use these qualified names: Drizzle may render select-list columns
 * unqualified, which a subquery would bind to its own table.
 */
const C_ID = sql.raw('"conversations"."id"');
const ME_PET = sql.raw('"me"."pet_id"');
const ME_READ = sql.raw('"me"."last_read_at"');
const activity = sql`coalesce(${conversations.lastMessageAt}, ${conversations.createdAt})`;

const build = (db: DbExecutor): ConversationsRepository => {
  const select = () =>
    db
      .select({
        id: conversations.id,
        matchId: conversations.matchId,
        activityAtExact: sql<string>`${activity}::text`,
        activityAt: sql<Date>`${activity}`.mapWith(conversations.createdAt),
        myPetId: me.petId,
        myPetStatus: myPet.status,
        otherPetId: other.petId,
        otherUserId: other.userId,
        myLastReadAt: me.lastReadAt,
        otherLastReadAt: other.lastReadAt,
        lastMessageId: sql<string | null>`(
          select m.id from messages m where m.conversation_id = ${C_ID}
          order by m.created_at desc, m.id desc limit 1
        )`,
        unreadCount: sql<number>`(
          select count(*)::int from messages m
          where m.conversation_id = ${C_ID} and m.sender_pet_id <> ${ME_PET}
            and m.created_at > coalesce(${ME_READ}, '-infinity'::timestamptz)
        )`,
      })
      .from(me)
      .innerJoin(conversations, eq(conversations.id, me.conversationId))
      .innerJoin(other, and(eq(other.conversationId, me.conversationId), ne(other.petId, me.petId)))
      .innerJoin(myPet, eq(myPet.id, me.petId))
      .innerJoin(otherPet, eq(otherPet.id, other.petId));

  /** Theirs, other pet not suspended, no block in either direction. */
  const visible = (userId: string) =>
    and(
      eq(me.userId, userId),
      ne(otherPet.status, 'suspended'),
      notExists(
        db
          .select({ one: sql`1` })
          .from(blocks)
          .where(
            or(
              and(eq(blocks.blockerId, me.userId), eq(blocks.blockedId, other.userId)),
              and(eq(blocks.blockerId, other.userId), eq(blocks.blockedId, me.userId)),
            ),
          ),
      ),
    );

  const repository: ConversationsRepository = {
    transaction: (fn) => (db as Database).transaction((tx) => fn(build(tx))),

    listForUser: ({ userId, petId, after, limit }) =>
      select()
        .where(
          and(
            visible(userId),
            petId ? eq(me.petId, petId) : undefined,
            after
              ? or(
                  sql`${activity} < ${after.at}::timestamptz`,
                  and(sql`${activity} = ${after.at}::timestamptz`, lt(conversations.id, after.id)),
                )
              : undefined,
          ),
        )
        .orderBy(desc(activity), desc(conversations.id))
        .limit(limit),

    async findForUser(userId, conversationId) {
      const [row] = await select().where(
        and(visible(userId), eq(conversations.id, conversationId)),
      );
      return row;
    },

    listMessages: (conversationId, { after, limit }) =>
      db
        .select({
          ...getTableColumns(messages),
          createdAtExact: sql<string>`${messages.createdAt}::text`,
        })
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, conversationId),
            after
              ? or(
                  lt(messages.createdAt, sql`${after.at}::timestamptz`),
                  and(
                    eq(messages.createdAt, sql`${after.at}::timestamptz`),
                    lt(messages.id, after.id),
                  ),
                )
              : undefined,
          ),
        )
        .orderBy(desc(messages.createdAt), desc(messages.id))
        .limit(limit),

    findMessagesByIds: async (ids) =>
      ids.length === 0 ? [] : db.select().from(messages).where(inArray(messages.id, ids)),

    async findMessage(conversationId, messageId) {
      const [row] = await db
        .select()
        .from(messages)
        .where(and(eq(messages.id, messageId), eq(messages.conversationId, conversationId)));
      return row;
    },

    async insertMessage(values) {
      const [row] = await db.insert(messages).values(values).returning();
      if (!row) throw new Error('Message insert returned no row');
      return row;
    },

    async touch(conversationId, senderPetId, messageId) {
      const sentAt = sql`(select m.created_at from messages m where m.id = ${messageId})`;
      await db
        .update(conversations)
        .set({
          lastMessageAt: sql`greatest(${conversations.lastMessageAt}, ${sentAt})`,
          updatedAt: sql`now()`,
        })
        .where(eq(conversations.id, conversationId));
      await db
        .update(conversationParticipants)
        .set({ lastReadAt: sql`greatest(${conversationParticipants.lastReadAt}, ${sentAt})` })
        .where(
          and(
            eq(conversationParticipants.conversationId, conversationId),
            eq(conversationParticipants.petId, senderPetId),
          ),
        );
    },

    async markRead(conversationId, petId) {
      // Only when something is actually unread: every update is a Realtime event (read
      // receipt) for the other participant, and no-op updates would make two open chats
      // ping-pong refetches forever.
      await db
        .update(conversationParticipants)
        .set({ lastReadAt: sql`greatest(${conversationParticipants.lastReadAt}, now())` })
        .where(
          and(
            eq(conversationParticipants.conversationId, conversationId),
            eq(conversationParticipants.petId, petId),
            exists(
              db
                .select({ one: sql`1` })
                .from(messages)
                .where(
                  and(
                    eq(messages.conversationId, conversationId),
                    ne(messages.senderPetId, petId),
                    sql`${messages.createdAt} > coalesce(${conversationParticipants.lastReadAt}, '-infinity'::timestamptz)`,
                  ),
                ),
            ),
          ),
        );
    },

    async answerPlaydate(conversationId, messageId, status) {
      const [row] = await db
        .update(messages)
        .set({ playdateStatus: status })
        .where(
          and(
            eq(messages.id, messageId),
            eq(messages.conversationId, conversationId),
            eq(messages.type, 'playdate_invite'),
            eq(messages.playdateStatus, 'pending'),
          ),
        )
        .returning();
      return row;
    },

    async enqueueEvent(type, payload) {
      await db.insert(outboxEvents).values({ type, payload });
    },

    async listPlaydates(userId, { petId, since, limit }) {
      const scheduledAt = sql`(${messages.playdate} ->> 'scheduledAt')::timestamptz`;
      const rows = await db
        .select({ message: messages, myPetId: me.petId, otherPetId: other.petId })
        .from(messages)
        .innerJoin(me, eq(me.conversationId, messages.conversationId))
        .innerJoin(
          other,
          and(eq(other.conversationId, messages.conversationId), ne(other.petId, me.petId)),
        )
        .innerJoin(otherPet, eq(otherPet.id, other.petId))
        .where(
          and(
            visible(userId),
            eq(messages.type, 'playdate_invite'),
            petId ? eq(me.petId, petId) : undefined,
            sql`${scheduledAt} >= ${since.toISOString()}::timestamptz`,
          ),
        )
        .orderBy(asc(scheduledAt), asc(messages.id))
        .limit(limit);
      return rows;
    },
  };
  return repository;
};

export const createConversationsRepository = (db: DbExecutor): ConversationsRepository => build(db);
