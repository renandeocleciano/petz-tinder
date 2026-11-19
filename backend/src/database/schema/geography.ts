import { customType } from 'drizzle-orm/pg-core';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/** Parses the hex EWKB Postgres returns for a geography point. */
const parseEwkbPoint = (hex: string): GeoPoint => {
  const buffer = Buffer.from(hex, 'hex');
  const littleEndian = buffer.readUInt8(0) === 1;
  const type = littleEndian ? buffer.readUInt32LE(1) : buffer.readUInt32BE(1);
  const offset = type & 0x20000000 ? 9 : 5; // skip SRID when present
  const read = (at: number) => (littleEndian ? buffer.readDoubleLE(at) : buffer.readDoubleBE(at));
  return { longitude: read(offset), latitude: read(offset + 8) };
};

/**
 * `geography(Point, 4326)`. Written as EWKT. Repositories must never send this value to
 * the client: responses expose distances and obfuscated positions only.
 */
export const geographyPoint = customType<{ data: GeoPoint; driverData: string }>({
  dataType: () => 'geography(Point, 4326)',
  toDriver: ({ latitude, longitude }) => `SRID=4326;POINT(${longitude} ${latitude})`,
  fromDriver: parseEwkbPoint,
});
