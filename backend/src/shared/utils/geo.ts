import { createHash } from 'node:crypto';

import type { GeoPoint } from '../../database/schema/geography.js';

/**
 * Rounds a coordinate to 2 decimals (~1.1 km). Applied before anything is stored, even
 * though the app already sends approximate positions: the server never trusts precision.
 */
export const approximate = ({ latitude, longitude }: GeoPoint): GeoPoint => ({
  latitude: Math.round(latitude * 100) / 100,
  longitude: Math.round(longitude * 100) / 100,
});

/** ~500 m in degrees of latitude. */
const OBFUSCATION_GRID = 0.005;
/** Max offset applied on top of the grid (~450 m). */
const OBFUSCATION_JITTER = 0.004;

const snap = (value: number, step: number) => Math.round(value / step) * step;
const round = (value: number, decimals: number) => Number(value.toFixed(decimals));

/**
 * Map position for a pet: snapped to a ~500 m grid, then moved by an offset derived from
 * the pet id. The offset is stable, so repeated requests cannot be averaged out.
 */
export const obfuscate = (point: GeoPoint, seed: string): GeoPoint => {
  const hash = createHash('sha256').update(`petz-map:${seed}`).digest();
  const unit = (offset: number) => hash.readUInt32BE(offset) / 0xffffffff - 0.5;
  return {
    latitude: round(snap(point.latitude, OBFUSCATION_GRID) + unit(0) * 2 * OBFUSCATION_JITTER, 4),
    longitude: round(snap(point.longitude, OBFUSCATION_GRID) + unit(4) * 2 * OBFUSCATION_JITTER, 4),
  };
};

/**
 * Distances are never exact: locations are stored with ~1 km precision, so we answer in
 * 500 m steps with a 500 m floor.
 */
export const roundDistance = (meters: number) => Math.max(500, Math.round(meters / 500) * 500);
