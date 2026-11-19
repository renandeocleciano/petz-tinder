import { z } from 'zod';

import { decodeCursor, encodeCursor } from '../../shared/utils/cursor.js';
import { approximate, roundDistance } from '../../shared/utils/geo.js';
import type { MediaService } from '../media/media.service.js';
import { BUCKETS } from '../media/media.types.js';
import { PetForbiddenError, PetNotFoundError, PetSuspendedError } from '../pets/pets.errors.js';
import { createPetPresenter } from '../pets/pets.presenter.js';
import type { PetsRepository } from '../pets/pets.repository.js';
import type { DiscoveryRepository } from './discovery.repository.js';
import {
  MAX_NEARBY_PINS,
  type DiscoveryPetDto,
  type DiscoveryQuery,
  type NearbyPinDto,
  type NearbyQueryInput,
} from './discovery.schemas.js';

interface Deps {
  repository: DiscoveryRepository;
  petsRepository: PetsRepository;
  media: MediaService;
  now?: () => Date;
}

const cursorSchema = z.tuple([z.number().int(), z.uuid()]);

export const createDiscoveryService = ({
  repository,
  petsRepository,
  media,
  now = () => new Date(),
}: Deps) => {
  const present = createPetPresenter({ publicUrl: media.publicUrl, now });

  /** The pet browsing must belong to the caller and be allowed to interact. */
  const assertActingPet = async (userId: string, petId: string) => {
    const pet = await petsRepository.findById(petId);
    if (!pet) throw new PetNotFoundError();
    if (pet.ownerId !== userId) throw new PetForbiddenError();
    if (pet.status === 'suspended') throw new PetSuspendedError();
  };

  return {
    async discover(
      userId: string,
      { petId, latitude, longitude, radiusKm, cursor, limit, ...filters }: DiscoveryQuery,
    ): Promise<{ data: DiscoveryPetDto[]; nextCursor: string | null }> {
      const decoded = cursor ? decodeCursor(cursorSchema, cursor) : undefined;
      const after = decoded && { score: decoded[0], id: decoded[1] };
      await assertActingPet(userId, petId);

      const candidates = await repository.findCandidates({
        ...filters,
        userId,
        petId,
        origin: approximate({ latitude, longitude }),
        radiusMeters: radiusKm * 1000,
        after,
        limit: limit + 1,
      });
      const page = candidates.slice(0, limit);
      const last = page.at(-1);
      const nextCursor =
        candidates.length > limit && last ? encodeCursor([last.score, last.id]) : null;

      const records = await petsRepository.findByIds(page.map((candidate) => candidate.id));
      const byId = new Map((await petsRepository.hydrate(records)).map((pet) => [pet.id, pet]));
      // A candidate deleted between the two queries is simply skipped.
      const data = page.flatMap((candidate) => {
        const pet = byId.get(candidate.id);
        return pet
          ? [{ ...present(pet), distanceMeters: roundDistance(candidate.distanceMeters) }]
          : [];
      });
      return { data, nextCursor };
    },

    async nearby(
      userId: string,
      { petId, latitude, longitude, radiusKm }: NearbyQueryInput,
    ): Promise<{ total: number; data: NearbyPinDto[] }> {
      await assertActingPet(userId, petId);
      const result = await repository.findNearby({
        userId,
        petId,
        origin: approximate({ latitude, longitude }),
        radiusMeters: radiusKm * 1000,
        limit: MAX_NEARBY_PINS,
      });
      return {
        total: result.total,
        data: result.pets.map((pet) => ({
          id: pet.id,
          latitude: pet.position.latitude,
          longitude: pet.position.longitude,
          species: pet.species,
          distanceMeters: roundDistance(pet.distanceMeters),
          isMatch: pet.isMatch,
          locked: false,
          pet: {
            id: pet.id,
            name: pet.name,
            breed: pet.breed,
            coverUrl: pet.coverPath ? media.publicUrl(BUCKETS.pet_photo, pet.coverPath) : null,
          },
        })),
      };
    },
  };
};

export type DiscoveryService = ReturnType<typeof createDiscoveryService>;
