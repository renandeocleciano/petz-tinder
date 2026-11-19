import { index, pgEnum, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { id, timestamps } from './columns.js';
import { pets } from './pets.js';
import { users } from './users.js';

export const REPORT_REASONS = [
  'spam',
  'fake_profile',
  'abuse',
  'inappropriate_content',
  'safety',
  'other',
] as const;
export const REPORT_STATUSES = ['open', 'reviewed', 'dismissed'] as const;

export const reportReason = pgEnum('report_reason', REPORT_REASONS);
export const reportStatus = pgEnum('report_status', REPORT_STATUSES);

/**
 * Moderation trail. References are nulled (not cascaded) when an account or pet is
 * deleted, so the report survives for review.
 */
export const reports = pgTable(
  'reports',
  {
    id: id(),
    reporterId: uuid().references(() => users.id, { onDelete: 'set null' }),
    targetUserId: uuid().references(() => users.id, { onDelete: 'set null' }),
    targetPetId: uuid().references(() => pets.id, { onDelete: 'set null' }),
    reason: reportReason().notNull(),
    description: varchar({ length: 1000 }),
    status: reportStatus().notNull().default('open'),
    reviewedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (table) => [index().on(table.status, table.createdAt), index().on(table.targetUserId)],
).enableRLS();

export type ReportRow = typeof reports.$inferSelect;
