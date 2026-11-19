/**
 * Response shapes of the Petz backend (`/v1`). The backend is the source of truth; these
 * types mirror its Zod schemas and are converted to the app's domain types in `mappers.ts`.
 */
import type {
  Availability,
  Interest,
  LikeType,
  MessageType,
  PersonalityTrait,
  PetGender,
  PetSize,
  PlaydateStatus,
  Species,
  SubscriptionTier,
} from '@/types/domain';

export interface Page<T> {
  data: T[];
  nextCursor: string | null;
}

export interface UserDto {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  subscriptionTier: SubscriptionTier;
  createdAt: string;
}

export interface PetDto {
  id: string;
  ownerId: string;
  name: string;
  species: Species;
  breed: string;
  birthDate: string | null;
  age: number;
  ageIsApproximate: boolean;
  gender: PetGender;
  size: PetSize;
  neutered: boolean;
  bio: string;
  city: string;
  personalityTraits: PersonalityTrait[];
  interests: Interest[];
  preferences: string[];
  availability: Availability | null;
  verified: boolean;
  status: 'active' | 'hidden' | 'suspended';
  photos: { id: string; url: string }[];
  coverUrl: string | null;
  createdAt: string;
}

export interface DiscoveryPetDto extends PetDto {
  distanceMeters: number;
}

export interface NearbyPinDto {
  id: string;
  latitude: number;
  longitude: number;
  species: Species;
  distanceMeters: number;
  isMatch: boolean;
  locked: boolean;
  pet: { id: string; name: string; breed: string; coverUrl: string | null } | null;
}

export interface LikeDto {
  id: string;
  fromPetId: string;
  toPetId: string;
  type: Exclude<LikeType, 'direct_message'>;
  createdAt: string;
}

export interface MatchDto {
  id: string;
  conversationId: string;
  myPetId: string;
  pet: PetDto;
  isNew: boolean;
  createdAt: string;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  senderPetId: string;
  senderUserId: string;
  type: MessageType;
  text: string | null;
  imageUrl: string | null;
  playdate: {
    placeName: string;
    latitude: number;
    longitude: number;
    scheduledAt: string;
    status: PlaydateStatus;
  } | null;
  createdAt: string;
  readAt: string | null;
}

export interface ConversationSummaryDto {
  id: string;
  matchId: string | null;
  myPetId: string;
  pet: PetDto;
  lastMessage: MessageDto | null;
  unreadCount: number;
  updatedAt: string;
}

export interface PlaydateSummaryDto {
  id: string;
  conversationId: string;
  myPetId: string;
  pet: PetDto;
  direction: 'sent' | 'received';
  placeName: string;
  latitude: number;
  longitude: number;
  scheduledAt: string;
  status: PlaydateStatus;
  createdAt: string;
}

export interface ConversationDetailDto {
  id: string;
  matchId: string | null;
  myPet: PetDto;
  pet: PetDto;
  unreadCount: number;
}

export type BackendReportReason =
  'spam' | 'fake_profile' | 'abuse' | 'inappropriate_content' | 'safety' | 'other';

export interface ReportDto {
  id: string;
  targetUserId: string;
  targetPetId: string | null;
  reason: BackendReportReason;
  status: 'open' | 'reviewed' | 'dismissed';
  createdAt: string;
}

export interface BlockDto {
  userId: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export type MediaPurpose = 'pet_photo' | 'user_avatar' | 'chat_media';

export interface UploadUrlDto {
  bucket: string;
  path: string;
  uploadUrl: string;
  token: string;
  expiresInSeconds: number;
}
