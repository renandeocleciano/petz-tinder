import type {
  INTERESTS,
  PERSONALITY_TRAITS,
  PetPhotoRow,
  PetRow,
} from '../../database/schema/index.js';

export type PersonalityTrait = (typeof PERSONALITY_TRAITS)[number];
export type Interest = (typeof INTERESTS)[number];

/** A pet row without its location: the real coordinate never leaves the repository. */
export type PetRecord = Omit<PetRow, 'location'>;

export interface PetAggregate extends PetRecord {
  personalityTraits: PersonalityTrait[];
  interests: Interest[];
  photos: Pick<PetPhotoRow, 'id' | 'storagePath' | 'position'>[];
}
