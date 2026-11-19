import { and, asc, count, eq, inArray, max } from 'drizzle-orm';
import { getTableColumns } from 'drizzle-orm';

import type { Database, DbExecutor } from '../../database/index.js';
import {
  petInterests,
  petPhotos,
  pets,
  petTraits,
  type NewPetRow,
  type PetPhotoRow,
} from '../../database/schema/index.js';
import type { Interest, PersonalityTrait, PetAggregate, PetRecord } from './pets.types.js';

const { location: _location, ...petColumns } = getTableColumns(pets);

export type PetUpdate = Partial<Omit<NewPetRow, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>>;

export interface PetsRepository {
  /** Runs `fn` atomically; nested calls reuse the outer transaction (savepoint). */
  transaction<T>(fn: (repository: PetsRepository) => Promise<T>): Promise<T>;
  countByOwner(ownerId: string): Promise<number>;
  insert(values: NewPetRow): Promise<PetRecord>;
  update(id: string, values: PetUpdate): Promise<PetRecord>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<PetRecord | undefined>;
  /** Unordered; callers reorder by id when order matters. */
  findByIds(ids: string[]): Promise<PetRecord[]>;
  listByOwner(ownerId: string): Promise<PetRecord[]>;
  replaceTraits(petId: string, traits: PersonalityTrait[]): Promise<void>;
  replaceInterests(petId: string, interests: Interest[]): Promise<void>;
  /** Loads traits, interests and photos for many pets in three queries. */
  hydrate(records: PetRecord[]): Promise<PetAggregate[]>;
  countPhotos(petId: string): Promise<number>;
  insertPhoto(petId: string, storagePath: string): Promise<PetPhotoRow>;
  photoPathExists(storagePath: string): Promise<boolean>;
  deletePhoto(petId: string, photoId: string): Promise<PetPhotoRow | undefined>;
  listPhotoPaths(petId: string): Promise<string[]>;
}

const groupBy = <T, K>(rows: T[], key: (row: T) => K) => {
  const groups = new Map<K, T[]>();
  for (const row of rows) {
    const list = groups.get(key(row)) ?? [];
    list.push(row);
    groups.set(key(row), list);
  }
  return groups;
};

const build = (db: DbExecutor): PetsRepository => ({
  transaction: (fn) => (db as Database).transaction((tx) => fn(build(tx))),

  async countByOwner(ownerId) {
    const [row] = await db.select({ total: count() }).from(pets).where(eq(pets.ownerId, ownerId));
    return row?.total ?? 0;
  },

  async insert(values) {
    const [row] = await db.insert(pets).values(values).returning(petColumns);
    if (!row) throw new Error('Pet insert returned no row');
    return row;
  },

  async update(id, values) {
    const [row] = await db.update(pets).set(values).where(eq(pets.id, id)).returning(petColumns);
    if (!row) throw new Error(`Pet ${id} vanished during update`);
    return row;
  },

  async delete(id) {
    await db.delete(pets).where(eq(pets.id, id));
  },

  async findById(id) {
    const [row] = await db.select(petColumns).from(pets).where(eq(pets.id, id));
    return row;
  },

  findByIds: async (ids) =>
    ids.length === 0 ? [] : db.select(petColumns).from(pets).where(inArray(pets.id, ids)),

  listByOwner: (ownerId) =>
    db.select(petColumns).from(pets).where(eq(pets.ownerId, ownerId)).orderBy(asc(pets.createdAt)),

  async replaceTraits(petId, traits) {
    await db.delete(petTraits).where(eq(petTraits.petId, petId));
    if (traits.length > 0) {
      await db.insert(petTraits).values(traits.map((trait) => ({ petId, trait })));
    }
  },

  async replaceInterests(petId, interests) {
    await db.delete(petInterests).where(eq(petInterests.petId, petId));
    if (interests.length > 0) {
      await db.insert(petInterests).values(interests.map((interest) => ({ petId, interest })));
    }
  },

  async hydrate(records) {
    if (records.length === 0) return [];
    const ids = records.map((record) => record.id);
    const [traits, interests, photos] = await Promise.all([
      db.select().from(petTraits).where(inArray(petTraits.petId, ids)),
      db.select().from(petInterests).where(inArray(petInterests.petId, ids)),
      db
        .select({
          id: petPhotos.id,
          petId: petPhotos.petId,
          storagePath: petPhotos.storagePath,
          position: petPhotos.position,
        })
        .from(petPhotos)
        .where(inArray(petPhotos.petId, ids))
        .orderBy(asc(petPhotos.position), asc(petPhotos.createdAt)),
    ]);
    const traitsByPet = groupBy(traits, (row) => row.petId);
    const interestsByPet = groupBy(interests, (row) => row.petId);
    const photosByPet = groupBy(photos, (row) => row.petId);

    return records.map((record) => ({
      ...record,
      personalityTraits: (traitsByPet.get(record.id) ?? []).map((row) => row.trait),
      interests: (interestsByPet.get(record.id) ?? []).map((row) => row.interest),
      photos: (photosByPet.get(record.id) ?? []).map(({ id, storagePath, position }) => ({
        id,
        storagePath,
        position,
      })),
    }));
  },

  async countPhotos(petId) {
    const [row] = await db
      .select({ total: count() })
      .from(petPhotos)
      .where(eq(petPhotos.petId, petId));
    return row?.total ?? 0;
  },

  async insertPhoto(petId, storagePath) {
    const [last] = await db
      .select({ position: max(petPhotos.position) })
      .from(petPhotos)
      .where(eq(petPhotos.petId, petId));
    const position = (last?.position ?? -1) + 1;
    const [row] = await db.insert(petPhotos).values({ petId, storagePath, position }).returning();
    if (!row) throw new Error('Photo insert returned no row');
    return row;
  },

  async photoPathExists(storagePath) {
    const [row] = await db
      .select({ id: petPhotos.id })
      .from(petPhotos)
      .where(eq(petPhotos.storagePath, storagePath));
    return Boolean(row);
  },

  async deletePhoto(petId, photoId) {
    const [row] = await db
      .delete(petPhotos)
      .where(and(eq(petPhotos.petId, petId), eq(petPhotos.id, photoId)))
      .returning();
    return row;
  },

  async listPhotoPaths(petId) {
    const rows = await db
      .select({ storagePath: petPhotos.storagePath })
      .from(petPhotos)
      .where(eq(petPhotos.petId, petId));
    return rows.map((row) => row.storagePath);
  },
});

export const createPetsRepository = (db: DbExecutor): PetsRepository => build(db);
