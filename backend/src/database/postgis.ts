import { sql, type SQL } from 'drizzle-orm';

import type { GeoPoint } from './schema/geography.js';

/**
 * PostGIS lives in the `extensions` schema on Supabase. Functions are schema-qualified so
 * queries do not depend on the connection's search_path.
 */
export const makePoint = ({ latitude, longitude }: GeoPoint): SQL =>
  sql`extensions.st_setsrid(extensions.st_makepoint(${longitude}::float8, ${latitude}::float8), 4326)::extensions.geography`;

export const stDistance = (a: SQL | unknown, b: SQL): SQL<number> =>
  sql<number>`extensions.st_distance(${a}, ${b})`;

/** Index-friendly radius filter (uses the GiST index on the geography column). */
export const stDWithin = (a: SQL | unknown, b: SQL, meters: number): SQL<boolean> =>
  sql<boolean>`extensions.st_dwithin(${a}, ${b}, ${meters}::float8)`;

export const stLatitude = (point: SQL | unknown): SQL<number> =>
  sql<number>`extensions.st_y(${point}::extensions.geometry)`;

export const stLongitude = (point: SQL | unknown): SQL<number> =>
  sql<number>`extensions.st_x(${point}::extensions.geometry)`;
