import type { NearbyPin } from '@/lib/api/types';

export type MapItem =
  | { kind: 'pin'; id: string; latitude: number; longitude: number; pin: NearbyPin }
  | { kind: 'cluster'; id: string; latitude: number; longitude: number; count: number };

const CELL_PX = 72;
const TILE_PX = 256;

/**
 * Grid clustering in screen space: pins that would overlap at the current zoom are
 * merged into a bubble with a count. Lightweight enough for the nearby result sizes
 * the API returns, and keeps custom avatar markers (which native clustering can't).
 */
export const clusterPins = (pins: NearbyPin[], zoom: number): MapItem[] => {
  const cellDegrees = (360 / 2 ** zoom) * (CELL_PX / TILE_PX);
  const cells = new Map<string, NearbyPin[]>();

  pins.forEach((pin) => {
    const key = `${Math.floor(pin.longitude / cellDegrees)}:${Math.floor(pin.latitude / cellDegrees)}`;
    cells.set(key, [...(cells.get(key) ?? []), pin]);
  });

  return [...cells.entries()].map(([key, group]): MapItem => {
    const [first] = group;
    if (group.length === 1 && first) {
      return {
        kind: 'pin',
        id: first.id,
        latitude: first.latitude,
        longitude: first.longitude,
        pin: first,
      };
    }
    const latitude = group.reduce((sum, p) => sum + p.latitude, 0) / group.length;
    const longitude = group.reduce((sum, p) => sum + p.longitude, 0) / group.length;
    return { kind: 'cluster', id: `cluster-${key}`, latitude, longitude, count: group.length };
  });
};
