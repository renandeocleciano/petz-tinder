import { describe, expect, it } from 'vitest';

import { approximate, obfuscate, roundDistance } from '../geo.js';

describe('geo utils', () => {
  it('approximates to 2 decimals', () => {
    expect(approximate({ latitude: -22.971234, longitude: -43.186789 })).toEqual({
      latitude: -22.97,
      longitude: -43.19,
    });
  });

  it('obfuscates deterministically, within ~1 km, differently per pet', () => {
    const point = { latitude: -22.97, longitude: -43.18 };
    const a = obfuscate(point, 'pet-a');
    expect(obfuscate(point, 'pet-a')).toEqual(a);
    expect(obfuscate(point, 'pet-b')).not.toEqual(a);
    expect(Math.abs(a.latitude - point.latitude)).toBeLessThan(0.0075);
    expect(Math.abs(a.longitude - point.longitude)).toBeLessThan(0.0075);
  });

  it('spreads pets that share a grid cell', () => {
    const point = { latitude: -22.97, longitude: -43.18 };
    const positions = new Set(
      Array.from({ length: 20 }, (_, i) => JSON.stringify(obfuscate(point, `pet-${i}`))),
    );
    expect(positions.size).toBe(20);
  });

  it.each([
    [0, 500],
    [240, 500],
    [760, 1000],
    [1509, 1500],
    [15_160, 15_000],
  ])('rounds %d m to %d m', (meters, expected) => {
    expect(roundDistance(meters)).toBe(expected);
  });
});
