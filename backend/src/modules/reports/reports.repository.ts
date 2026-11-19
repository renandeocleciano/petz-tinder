import type { DbExecutor } from '../../database/index.js';
import { reports, type ReportRow } from '../../database/schema/index.js';

export interface NewReport {
  reporterId: string;
  targetUserId: string;
  targetPetId: string | null;
  reason: ReportRow['reason'];
  description: string | null;
}

export interface ReportsRepository {
  insert(report: NewReport): Promise<ReportRow>;
}

export const createReportsRepository = (db: DbExecutor): ReportsRepository => ({
  async insert(report) {
    const [row] = await db.insert(reports).values(report).returning();
    if (!row) throw new Error('Report insert returned no row');
    return row;
  },
});
