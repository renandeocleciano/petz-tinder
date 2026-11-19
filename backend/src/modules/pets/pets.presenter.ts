import { ageInYears } from '../../shared/utils/age.js';
import { BUCKETS, type Bucket } from '../media/media.types.js';
import type { PetDto } from './pets.schemas.js';
import type { PetAggregate } from './pets.types.js';

export interface PetPresenterDeps {
  publicUrl: (bucket: Bucket, path: string) => string;
  now: () => Date;
}

/** Builds the public pet representation. It never includes coordinates. */
export const createPetPresenter =
  ({ publicUrl, now }: PetPresenterDeps) =>
  (pet: PetAggregate): PetDto => {
    const photos = pet.photos.map((photo) => ({
      id: photo.id,
      url: publicUrl(BUCKETS.pet_photo, photo.storagePath),
    }));
    return {
      id: pet.id,
      ownerId: pet.ownerId,
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      birthDate: pet.birthDateApproximate ? null : pet.birthDate,
      age: ageInYears(pet.birthDate, now()),
      ageIsApproximate: pet.birthDateApproximate,
      gender: pet.gender,
      size: pet.size,
      neutered: pet.neutered,
      bio: pet.bio,
      city: pet.city,
      personalityTraits: pet.personalityTraits,
      interests: pet.interests,
      preferences: pet.preferences,
      availability: pet.availability ?? null,
      verified: pet.verified,
      status: pet.status,
      photos,
      coverUrl: photos[0]?.url ?? null,
      createdAt: pet.createdAt.toISOString(),
    };
  };

export type PetPresenter = ReturnType<typeof createPetPresenter>;
