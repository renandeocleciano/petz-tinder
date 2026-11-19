import type { PlaydateSummary } from '@/lib/api';

export interface PlaydateGroups {
  /** Accepted and still ahead, soonest first. */
  upcoming: PlaydateSummary[];
  /** Waiting for an answer and still ahead, soonest first. */
  pending: PlaydateSummary[];
  /** Already happened, or declined; most recent first. */
  past: PlaydateSummary[];
}

export const groupPlaydates = (
  playdates: PlaydateSummary[],
  now: Date = new Date(),
): PlaydateGroups => {
  const at = (p: PlaydateSummary) => new Date(p.scheduledAt).getTime();
  const ahead = (p: PlaydateSummary) => at(p) >= now.getTime();
  const soonest = (a: PlaydateSummary, b: PlaydateSummary) => at(a) - at(b);
  return {
    upcoming: playdates.filter((p) => p.status === 'accepted' && ahead(p)).sort(soonest),
    pending: playdates.filter((p) => p.status === 'pending' && ahead(p)).sort(soonest),
    past: playdates
      .filter((p) => !ahead(p) || p.status === 'declined')
      .sort((a, b) => soonest(b, a)),
  };
};

/** Short status shown on each row. */
export const playdateStatusLabel = (playdate: PlaydateSummary, now: Date = new Date()) => {
  const past = new Date(playdate.scheduledAt).getTime() < now.getTime();
  if (playdate.status === 'declined') return 'Recusado';
  if (playdate.status === 'accepted') return past ? 'Realizado' : 'Confirmado';
  if (past) return 'Sem resposta';
  return playdate.direction === 'received' ? 'Responder' : 'Aguardando';
};
