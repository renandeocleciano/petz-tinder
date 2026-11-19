import type { GeoPoint } from '../../database/schema/geography.js';
import type {
  PERSONALITY_TRAITS,
  PET_GENDERS,
  PET_SIZES,
  SPECIES,
} from '../../database/schema/index.js';

export interface DiscoveryCursor {
  score: number;
  id: string;
}

export interface DiscoveryFilters {
  species?: (typeof SPECIES)[number][] | undefined;
  gender?: (typeof PET_GENDERS)[number][] | undefined;
  size?: (typeof PET_SIZES)[number][] | undefined;
  traits?: (typeof PERSONALITY_TRAITS)[number][] | undefined;
  ageMin?: number | undefined;
  ageMax?: number | undefined;
}

export interface CandidatesQuery extends DiscoveryFilters {
  userId: string;
  /** The pet doing the swiping: its likes, dislikes and traits drive exclusion and ranking. */
  petId: string;
  origin: GeoPoint;
  radiusMeters: number;
  after?: DiscoveryCursor | undefined;
  limit: number;
}

export interface Candidate {
  id: string;
  distanceMeters: number;
  score: number;
}

export interface NearbyQuery {
  userId: string;
  petId: string;
  origin: GeoPoint;
  radiusMeters: number;
  limit: number;
}

export interface NearbyPet {
  id: string;
  name: string;
  breed: string;
  species: (typeof SPECIES)[number];
  coverPath: string | null;
  /** Already obfuscated by the repository; the real position never leaves it. */
  position: GeoPoint;
  distanceMeters: number;
  isMatch: boolean;
}

export interface NearbyResult {
  total: number;
  pets: NearbyPet[];
}
