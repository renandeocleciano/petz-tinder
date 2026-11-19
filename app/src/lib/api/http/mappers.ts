import type { Like, Message, Pet, ReportReason, User } from '@/types/domain';

import type { ConversationSummary, MatchSummary, NearbyPin, PlaydateSummary } from '../types';
import type {
  BackendReportReason,
  ConversationSummaryDto,
  LikeDto,
  MatchDto,
  MessageDto,
  NearbyPinDto,
  PetDto,
  PlaydateSummaryDto,
  UserDto,
} from './contract';

export const toUser = (user: UserDto): User => ({
  id: user.id,
  name: user.name ?? '',
  email: user.email ?? '',
  avatarUrl: user.avatarUrl,
  subscriptionTier: user.subscriptionTier,
  createdAt: user.createdAt,
});

/**
 * The backend never sends coordinates for pets (privacy); the domain fields are kept at 0
 * and no screen reads them for other people's pets. Distances come as `distanceMeters`.
 */
export const toPet = (pet: PetDto, distanceMeters?: number): Pet => ({
  id: pet.id,
  ownerId: pet.ownerId,
  name: pet.name,
  species: pet.species,
  breed: pet.breed,
  birthDate: pet.birthDate,
  age: pet.age,
  size: pet.size,
  gender: pet.gender,
  neutered: pet.neutered,
  bio: pet.bio,
  latitude: 0,
  longitude: 0,
  approximateDistance: distanceMeters === undefined ? null : distanceMeters / 1000,
  city: pet.city,
  photos: pet.photos.map((photo) => photo.url),
  coverUrl: pet.coverUrl,
  personalityTraits: pet.personalityTraits,
  interests: pet.interests,
  preferences: pet.preferences,
  availability: pet.availability,
  verified: pet.verified,
});

export const toMessage = (message: MessageDto): Message => ({
  id: message.id,
  conversationId: message.conversationId,
  senderUserId: message.senderUserId,
  text: message.text ?? '',
  type: message.type,
  ...(message.imageUrl ? { imageUrl: message.imageUrl } : {}),
  ...(message.playdate
    ? {
        playdate: {
          // The invite lives inside the message; its id is the message id.
          id: message.id,
          placeName: message.playdate.placeName,
          placeImageUrl: null,
          latitude: message.playdate.latitude,
          longitude: message.playdate.longitude,
          scheduledAt: message.playdate.scheduledAt,
          status: message.playdate.status,
        },
      }
    : {}),
  createdAt: message.createdAt,
  readAt: message.readAt,
});

export const toLike = (like: LikeDto): Like => ({ ...like });

/** `lastMessage`/`unreadCount` come from the conversation list when available. */
export const toMatchSummary = (
  match: MatchDto,
  conversation?: ConversationSummaryDto,
): MatchSummary => ({
  id: match.id,
  petAId: match.myPetId,
  petBId: match.pet.id,
  createdAt: match.createdAt,
  lastMessage: conversation?.lastMessage ? toMessage(conversation.lastMessage) : null,
  unreadCount: conversation?.unreadCount ?? 0,
  pet: toPet(match.pet),
  conversationId: match.conversationId,
  isNew: match.isNew,
});

export const toConversationSummary = (
  conversation: ConversationSummaryDto,
): ConversationSummary => ({
  id: conversation.id,
  matchId: conversation.matchId,
  pet: toPet(conversation.pet),
  lastMessage: conversation.lastMessage ? toMessage(conversation.lastMessage) : null,
  unreadCount: conversation.unreadCount,
});

export const toNearbyPin = (pin: NearbyPinDto): NearbyPin => ({
  id: pin.id,
  latitude: pin.latitude,
  longitude: pin.longitude,
  species: pin.species,
  locked: pin.locked,
  isMatch: pin.isMatch,
  pet: pin.pet
    ? {
        id: pin.pet.id,
        name: pin.pet.name,
        breed: pin.pet.breed,
        photos: pin.pet.coverUrl ? [pin.pet.coverUrl] : [],
      }
    : null,
});

export const toPlaydateSummary = (playdate: PlaydateSummaryDto): PlaydateSummary => ({
  id: playdate.id,
  conversationId: playdate.conversationId,
  pet: toPet(playdate.pet),
  direction: playdate.direction,
  placeName: playdate.placeName,
  latitude: playdate.latitude,
  longitude: playdate.longitude,
  scheduledAt: playdate.scheduledAt,
  status: playdate.status,
});

const REPORT_REASONS: Record<ReportReason, BackendReportReason> = {
  inappropriate: 'inappropriate_content',
  spam: 'spam',
  fake_profile: 'fake_profile',
  unsafe: 'safety',
  other: 'other',
};

export const toBackendReportReason = (reason: ReportReason): BackendReportReason =>
  REPORT_REASONS[reason];
