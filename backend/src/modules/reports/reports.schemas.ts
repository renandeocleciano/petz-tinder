import { z } from 'zod';

import { REPORT_REASONS, REPORT_STATUSES } from '../../database/schema/index.js';

export const createReportBodySchema = z
  .object({
    targetUserId: z.uuid(),
    /** The pet that motivated the report, when there is one. Must belong to the target. */
    targetPetId: z.uuid().optional(),
    reason: z.enum(REPORT_REASONS),
    description: z.string().trim().min(1).max(1000).optional(),
  })
  .strict();

export const reportSchema = z
  .object({
    id: z.uuid(),
    targetUserId: z.uuid(),
    targetPetId: z.uuid().nullable(),
    reason: z.enum(REPORT_REASONS),
    status: z.enum(REPORT_STATUSES),
    createdAt: z.iso.datetime(),
  })
  .meta({ id: 'Report' });

export const reportResponseSchema = z.object({ report: reportSchema });

export type CreateReportBody = z.output<typeof createReportBodySchema>;
export type ReportDto = z.output<typeof reportSchema>;
