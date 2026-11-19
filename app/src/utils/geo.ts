import type { Coordinates } from '@/lib/api/types';

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

export const distanceKm = (a: Coordinates, b: Coordinates): number => {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
};

/**
 * Reduces precision to ~1.1 km (2 decimal places). Applied as soon as the device
 * location is read, so an exact coordinate is never stored or sent.
 */
export const approximate = ({ latitude, longitude }: Coordinates): Coordinates => ({
  latitude: Math.round(latitude * 100) / 100,
  longitude: Math.round(longitude * 100) / 100,
});

/** Deterministic pseudo-random number in [0, 1) derived from a string seed. */
const seededRandom = (seed: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 10_000) / 10_000;
};

/**
 * Snaps a coordinate to a ~500 m grid and adds a stable offset seeded by the entity id.
 * The displayed pin stays in the same place between renders but never reveals the
 * real position.
 */
export const obfuscateCoordinate = (coords: Coordinates, seed: string): Coordinates => {
  const GRID = 0.005;
  const JITTER = 0.004;
  const snap = (value: number) => Math.round(value / GRID) * GRID;
  const angle = seededRandom(`${seed}:a`) * Math.PI * 2;
  const magnitude = (0.35 + seededRandom(`${seed}:m`) * 0.65) * JITTER;
  return {
    latitude: snap(coords.latitude) + Math.sin(angle) * magnitude,
    longitude: snap(coords.longitude) + Math.cos(angle) * magnitude,
  };
};
