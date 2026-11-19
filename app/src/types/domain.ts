export type SubscriptionTier = 'free' | 'premium';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  subscriptionTier: SubscriptionTier;
  createdAt: string;
}

export type Species = 'dog' | 'cat' | 'other';
export type PetSize = 'small' | 'medium' | 'large';
export type PetGender = 'male' | 'female';

export type PersonalityTrait = 'playful' | 'calm' | 'sociable' | 'loves_park' | 'energetic' | 'shy';

export type Interest = 'play' | 'walks' | 'beach' | 'treats' | 'other_pets' | 'adventures';

export interface Availability {
  title: string;
  detail: string;
}

export interface PetStatsData {
  likes: number;
  matches: number;
  views: number;
}

export interface Pet {
  id: string;
  ownerId: string;
  name: string;
  species: Species;
  breed: string;
  birthDate: string | null;
  age: number;
  size: PetSize;
  gender: PetGender;
  neutered: boolean;
  bio: string;
  /** Always an approximate (obfuscated) coordinate. Never the tutor's exact position. */
  latitude: number;
  longitude: number;
  /** Distance in km from the viewer, computed by the server from approximate positions. */
  approximateDistance: number | null;
  city: string;
  photos: string[];
  coverUrl: string | null;
  personalityTraits: PersonalityTrait[];
  interests: Interest[];
  preferences: string[];
  availability: Availability | null;
  verified: boolean;
  /** Only returned for pets owned by the current user. */
  stats?: PetStatsData;
}

export type LikeType = 'like' | 'dislike' | 'super_like' | 'direct_message';

export interface Like {
  id: string;
  fromPetId: string;
  toPetId: string;
  type: LikeType;
  createdAt: string;
}

export type MessageType = 'text' | 'image' | 'playdate_invite';

export type PlaydateStatus = 'pending' | 'accepted' | 'declined';

export interface PlaydateInvite {
  id: string;
  placeName: string;
  placeImageUrl: string | null;
  latitude: number;
  longitude: number;
  scheduledAt: string;
  status: PlaydateStatus;
}

export interface Message {
  id: string;
  conversationId: string;
  senderUserId: string;
  text: string;
  type: MessageType;
  imageUrl?: string;
  playdate?: PlaydateInvite;
  createdAt: string;
  readAt: string | null;
}

export interface Match {
  id: string;
  petAId: string;
  petBId: string;
  createdAt: string;
  lastMessage: Message | null;
  unreadCount: number;
}

export interface ConversationParticipant {
  userId: string;
  petId: string;
}

export interface Conversation {
  id: string;
  /** null when the conversation was opened via premium direct message. */
  matchId: string | null;
  participants: ConversationParticipant[];
  messages: Message[];
}

export type ReportReason = 'inappropriate' | 'spam' | 'fake_profile' | 'unsafe' | 'other';

export interface Report {
  id: string;
  reporterUserId: string;
  targetPetId: string;
  reason: ReportReason;
  createdAt: string;
}

export interface Block {
  id: string;
  blockerUserId: string;
  blockedPetId: string;
  createdAt: string;
}

export interface PlaceSuggestion {
  id: string;
  name: string;
  imageUrl: string | null;
  latitude: number;
  longitude: number;
}
