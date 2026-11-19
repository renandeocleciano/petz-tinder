import type { PlaydateSummary } from '@/lib/api';
import { myPet } from '@/mocks/pets';

import { groupPlaydates, playdateStatusLabel } from '../groupPlaydates';

const NOW = new Date('2026-10-15T12:00:00Z');
const day = (offset: number) => new Date(NOW.getTime() + offset * 86_400_000).toISOString();

const playdate = (
  id: string,
  offset: number,
  status: PlaydateSummary['status'],
  direction: PlaydateSummary['direction'] = 'sent',
): PlaydateSummary => ({
  id,
  conversationId: 'c1',
  pet: myPet,
  direction,
  placeName: 'Parque Lage',
  latitude: -22.96,
  longitude: -43.21,
  scheduledAt: day(offset),
  status,
});

describe('groupPlaydates', () => {
  it('splits upcoming, pending and past, each in a useful order', () => {
    const groups = groupPlaydates(
      [
        playdate('far', 7, 'accepted'),
        playdate('soon', 1, 'accepted'),
        playdate('ask-later', 5, 'pending', 'received'),
        playdate('ask-soon', 2, 'pending'),
        playdate('declined-future', 3, 'declined'),
        playdate('old', -10, 'accepted'),
        playdate('recent', -1, 'pending'),
      ],
      NOW,
    );
    expect(groups.upcoming.map((p) => p.id)).toEqual(['soon', 'far']);
    expect(groups.pending.map((p) => p.id)).toEqual(['ask-soon', 'ask-later']);
    expect(groups.past.map((p) => p.id)).toEqual(['declined-future', 'recent', 'old']);
  });

  it.each([
    [playdate('a', 1, 'accepted'), 'Confirmado'],
    [playdate('b', -1, 'accepted'), 'Realizado'],
    [playdate('c', 1, 'pending', 'received'), 'Responder'],
    [playdate('d', 1, 'pending', 'sent'), 'Aguardando'],
    [playdate('e', -1, 'pending'), 'Sem resposta'],
    [playdate('f', 1, 'declined'), 'Recusado'],
  ])('labels %#', (item, label) => {
    expect(playdateStatusLabel(item, NOW)).toBe(label);
  });
});
