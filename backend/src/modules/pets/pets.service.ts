import { ValidationError } from '../../shared/errors/index.js';
import { MAX_PETS } from '../entitlements/entitlements.service.js';
import { estimatedBirthDate } from '../../shared/utils/age.js';
import { approximate } from '../../shared/utils/geo.js';
import type { MediaService } from '../media/media.service.js';
import { BUCKETS } from '../media/media.types.js';
import {
  PetForbiddenError,
  MultiplePetsPremiumError,
  PetLimitReachedError,
  PetNotFoundError,
  PhotoAlreadyUsedError,
  PhotoLimitReachedError,
  PhotoNotFoundError,
} from './pets.errors.js';
import { createPetPresenter } from './pets.presenter.js';
import type { PetsRepository, PetUpdate } from './pets.repository.js';
import {
  MAX_PHOTOS_PER_PET,
  type CreatePetBody,
  type PetDto,
  type UpdatePetBody,
} from './pets.schemas.js';
import type { PetRecord } from './pets.types.js';

const BUCKET = BUCKETS.pet_photo;

interface Deps {
  repository: PetsRepository;
  media: MediaService;
  /** Pets allowed for the user's plan (EntitlementsService.maxPets). */
  maxPets: (userId: string) => Promise<number>;
  now?: () => Date;
  /** Storage cleanup failures must not fail the request; they are only logged. */
  onCleanupError?: (error: unknown) => void;
}

export const createPetsService = ({
  repository,
  media,
  maxPets,
  now = () => new Date(),
  onCleanupError = () => undefined,
}: Deps) => {
  const toDto = createPetPresenter({ publicUrl: media.publicUrl, now });

  const load = async (record: PetRecord) => {
    const [aggregate] = await repository.hydrate([record]);
    if (!aggregate) throw new PetNotFoundError();
    return toDto(aggregate);
  };

  const birthFields = (input: {
    birthDate?: string | undefined;
    approximateAgeYears?: number | undefined;
  }): { birthDate: string; birthDateApproximate: boolean } | undefined => {
    if (input.birthDate !== undefined) {
      return { birthDate: input.birthDate, birthDateApproximate: false };
    }
    if (input.approximateAgeYears !== undefined) {
      return {
        birthDate: estimatedBirthDate(input.approximateAgeYears, now()),
        birthDateApproximate: true,
      };
    }
    return undefined;
  };

  const ownedPet = async (userId: string, petId: string) => {
    const pet = await repository.findById(petId);
    if (!pet) throw new PetNotFoundError();
    if (pet.ownerId !== userId) throw new PetForbiddenError();
    return pet;
  };

  const assertPhotosAvailable = async (userId: string, paths: string[]) => {
    for (const path of paths) {
      await media.assertUploaded(userId, BUCKET, path);
      if (await repository.photoPathExists(path)) throw new PhotoAlreadyUsedError();
    }
  };

  return {
    async create(userId: string, input: CreatePetBody): Promise<PetDto> {
      const [owned, limit] = await Promise.all([repository.countByOwner(userId), maxPets(userId)]);
      if (owned >= limit) {
        // The free plan's limit is a paywall; the premium one is a hard cap.
        throw limit < MAX_PETS.premium
          ? new MultiplePetsPremiumError(limit)
          : new PetLimitReachedError(limit);
      }
      const birth = birthFields(input);
      if (!birth) throw new ValidationError('Informe birthDate ou approximateAgeYears');
      await assertPhotosAvailable(userId, input.photoPaths);

      const record = await repository.transaction(async (tx) => {
        const pet = await tx.insert({
          ownerId: userId,
          name: input.name,
          species: input.species,
          breed: input.breed,
          ...birth,
          gender: input.gender,
          size: input.size,
          neutered: input.neutered,
          bio: input.bio,
          city: input.city,
          location: approximate(input),
          availability: input.availability,
          preferences: input.preferences,
        });
        await tx.replaceTraits(pet.id, input.personalityTraits);
        await tx.replaceInterests(pet.id, input.interests);
        for (const path of input.photoPaths) await tx.insertPhoto(pet.id, path);
        return pet;
      });
      return load(record);
    },

    /** Owners see their pets in any status; everyone else only sees active pets. */
    async get(viewerId: string, petId: string): Promise<PetDto> {
      const pet = await repository.findById(petId);
      if (!pet || (pet.ownerId !== viewerId && pet.status !== 'active')) {
        throw new PetNotFoundError();
      }
      return load(pet);
    },

    async listMine(userId: string): Promise<PetDto[]> {
      const records = await repository.listByOwner(userId);
      return (await repository.hydrate(records)).map(toDto);
    },

    async update(userId: string, petId: string, input: UpdatePetBody): Promise<PetDto> {
      await ownedPet(userId, petId);
      const { personalityTraits, interests, latitude, longitude, approximateAgeYears, ...rest } =
        input;
      const values: PetUpdate = {
        ...rest,
        ...birthFields({ birthDate: input.birthDate, approximateAgeYears }),
        ...(latitude !== undefined && longitude !== undefined
          ? { location: approximate({ latitude, longitude }) }
          : {}),
      };

      const record = await repository.transaction(async (tx) => {
        const pet = Object.keys(values).length > 0 ? await tx.update(petId, values) : undefined;
        if (personalityTraits) await tx.replaceTraits(petId, personalityTraits);
        if (interests) await tx.replaceInterests(petId, interests);
        return pet ?? (await tx.findById(petId));
      });
      if (!record) throw new PetNotFoundError();
      return load(record);
    },

    async remove(userId: string, petId: string): Promise<void> {
      await ownedPet(userId, petId);
      const paths = await repository.listPhotoPaths(petId);
      await repository.delete(petId);
      await media.remove(BUCKET, paths).catch(onCleanupError);
    },

    async addPhoto(userId: string, petId: string, path: string): Promise<PetDto> {
      const pet = await ownedPet(userId, petId);
      if ((await repository.countPhotos(petId)) >= MAX_PHOTOS_PER_PET) {
        throw new PhotoLimitReachedError(MAX_PHOTOS_PER_PET);
      }
      await assertPhotosAvailable(userId, [path]);
      await repository.insertPhoto(petId, path);
      return load(pet);
    },

    async removePhoto(userId: string, petId: string, photoId: string): Promise<void> {
      await ownedPet(userId, petId);
      const photo = await repository.deletePhoto(petId, photoId);
      if (!photo) throw new PhotoNotFoundError();
      await media.remove(BUCKET, [photo.storagePath]).catch(onCleanupError);
    },
  };
};

export type PetsService = ReturnType<typeof createPetsService>;
