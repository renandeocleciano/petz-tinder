import {
  and,
  asc,
  desc,
  eq,
  exists,
  gt,
  inArray,
  lt,
  lte,
  ne,
  notExists,
  or,
  sql,
} from 'drizzle-orm';

import type { DbExecutor } from '../../database/index.js';
import {
  makePoint,
  stDistance,
  stDWithin,
  stLatitude,
  stLongitude,
} from '../../database/postgis.js';
import { blocks, likes, pets, petTraits, users } from '../../database/schema/index.js';
import { obfuscate } from '../../shared/utils/geo.js';
import type { Candidate, CandidatesQuery, NearbyQuery, NearbyResult } from './discovery.types.js';

/** Dislikes hide a pet from the deck for this long. */
export const DISLIKE_COOLDOWN = '30 days';

/**
 * Ranking weights (integer points, higher first). Deliberately simple:
 * distance 0–40, owner activity 0–20, shared traits/interests 0–20, active boost 30.
 */
const SCORE = {
  distance: 40,
  activeDay: 20,
  activeWeek: 10,
  compatibilityStep: 4,
  compatibilityMax: 20,
  boost: 30,
};

/**
 * Drizzle renders columns unqualified inside `select` lists (`"id"`), which a correlated
 * subquery would bind to its own table. Raw fragments always use these qualified names.
 */
const PET_ID = sql.raw('"pets"."id"');
const OWNER_LAST_ACTIVE = sql.raw('"users"."last_active_at"');

export interface DiscoveryRepository {
  /** Ranked candidate ids, `limit` rows after the cursor. */
  findCandidates(query: CandidatesQuery): Promise<Candidate[]>;
  findNearby(query: NearbyQuery): Promise<NearbyResult>;
}

/** Hides pets whose owner blocked the viewer or was blocked by them. */
const notBlocked = (db: DbExecutor, userId: string) =>
  notExists(
    db
      .select({ one: sql`1` })
      .from(blocks)
      .where(
        or(
          and(eq(blocks.blockerId, userId), eq(blocks.blockedId, pets.ownerId)),
          and(eq(blocks.blockerId, pets.ownerId), eq(blocks.blockedId, userId)),
        ),
      ),
  );

const visibleTo = (db: DbExecutor, userId: string) =>
  and(eq(pets.status, 'active'), ne(pets.ownerId, userId), notBlocked(db, userId));

export const createDiscoveryRepository = (db: DbExecutor): DiscoveryRepository => ({
  async findCandidates(query) {
    const origin = makePoint(query.origin);
    const distance = stDistance(pets.location, origin);

    const alreadySwiped = notExists(
      db
        .select({ one: sql`1` })
        .from(likes)
        .where(
          and(
            eq(likes.fromPetId, query.petId),
            eq(likes.toPetId, pets.id),
            or(
              ne(likes.type, 'dislike'),
              gt(likes.updatedAt, sql`now() - ${DISLIKE_COOLDOWN}::interval`),
            ),
          ),
        ),
    );

    const filters = [
      query.species?.length ? inArray(pets.species, query.species) : undefined,
      query.gender?.length ? inArray(pets.gender, query.gender) : undefined,
      query.size?.length ? inArray(pets.size, query.size) : undefined,
      query.ageMin !== undefined
        ? lte(
            pets.birthDate,
            sql`(current_date - make_interval(years => ${query.ageMin}::int))::date`,
          )
        : undefined,
      query.ageMax !== undefined
        ? gt(
            pets.birthDate,
            sql`(current_date - make_interval(years => ${query.ageMax + 1}::int))::date`,
          )
        : undefined,
      query.traits?.length
        ? exists(
            db
              .select({ one: sql`1` })
              .from(petTraits)
              .where(and(eq(petTraits.petId, pets.id), inArray(petTraits.trait, query.traits))),
          )
        : undefined,
    ];

    const shared = sql`(
      (select count(*) from pet_traits t join pet_traits v on v.trait = t.trait and v.pet_id = ${query.petId}
        where t.pet_id = ${PET_ID})
      + (select count(*) from pet_interests t join pet_interests v on v.interest = t.interest and v.pet_id = ${query.petId}
        where t.pet_id = ${PET_ID})
    )`;
    const score = sql<number>`(
      greatest(0, ${SCORE.distance} - floor(${distance} / ${query.radiusMeters}::float8 * ${SCORE.distance}))
      + case
          when ${OWNER_LAST_ACTIVE} > now() - interval '1 day' then ${SCORE.activeDay}
          when ${OWNER_LAST_ACTIVE} > now() - interval '7 days' then ${SCORE.activeWeek}
          else 0
        end
      + least(${SCORE.compatibilityMax}, ${SCORE.compatibilityStep} * ${shared})
      + case when exists (
          select 1 from profile_boosts b where b.pet_id = ${PET_ID} and now() between b.starts_at and b.ends_at
        ) then ${SCORE.boost} else 0 end
    )::int`;

    const ranked = db.$with('ranked').as(
      db
        .select({ id: pets.id, distance: distance.as('distance'), score: score.as('score') })
        .from(pets)
        .innerJoin(users, eq(users.id, pets.ownerId))
        .where(
          and(
            visibleTo(db, query.userId),
            stDWithin(pets.location, origin, query.radiusMeters),
            alreadySwiped,
            ...filters,
          ),
        ),
    );

    const { after } = query;
    const rows = await db
      .with(ranked)
      .select()
      .from(ranked)
      .where(
        after
          ? or(
              lt(ranked.score, after.score),
              and(eq(ranked.score, after.score), gt(ranked.id, after.id)),
            )
          : undefined,
      )
      .orderBy(desc(ranked.score), asc(ranked.id))
      .limit(query.limit);

    return rows.map((row) => ({ id: row.id, distanceMeters: row.distance, score: row.score }));
  },

  async findNearby(query) {
    const origin = makePoint(query.origin);
    const distance = stDistance(pets.location, origin);

    const rows = await db
      .select({
        id: pets.id,
        name: pets.name,
        breed: pets.breed,
        species: pets.species,
        latitude: stLatitude(pets.location),
        longitude: stLongitude(pets.location),
        distance,
        coverPath: sql<string | null>`(
          select p.storage_path from pet_photos p where p.pet_id = ${PET_ID}
          order by p.position, p.created_at limit 1
        )`,
        isMatch: sql<boolean>`exists (
          select 1 from matches m
          where (m.pet_a_id = ${query.petId} and m.pet_b_id = ${PET_ID})
             or (m.pet_b_id = ${query.petId} and m.pet_a_id = ${PET_ID})
        )`,
        total: sql<number>`(count(*) over ())::int`,
      })
      .from(pets)
      .where(and(visibleTo(db, query.userId), stDWithin(pets.location, origin, query.radiusMeters)))
      .orderBy(asc(distance), asc(pets.id))
      .limit(query.limit);

    return {
      total: rows[0]?.total ?? 0,
      pets: rows.map(({ latitude, longitude, distance: meters, total: _total, ...pet }) => ({
        ...pet,
        position: obfuscate({ latitude, longitude }, pet.id),
        distanceMeters: meters,
      })),
    };
  },
});
