import type {
  Availability,
  Block,
  Interest,
  Like,
  LikeType,
  Match,
  Message,
  Pet,
  PetGender,
  PetSize,
  PersonalityTrait,
  PlaceSuggestion,
  PlaydateInvite,
  PlaydateStatus,
  Report,
  ReportReason,
  Species,
  User,
} from '@/types/domain';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface MeResponse {
  user: User;
  pets: Pet[];
}

export interface UpdateMeInput {
  name?: string;
  avatarUrl?: string | null;
  /** Expo push token for this device. */
  pushToken?: string;
}

export interface CreatePetInput {
  name: string;
  species: Species;
  breed: string;
  age: number;
  birthDate?: string | null;
  size: PetSize;
  gender: PetGender;
  neutered: boolean;
  bio?: string;
  city: string;
  latitude: number;
  longitude: number;
  photos: string[];
  personalityTraits: PersonalityTrait[];
  interests?: Interest[];
  availability?: Availability | null;
}

export type UpdatePetInput = Partial<CreatePetInput> & {
  coverUrl?: string | null;
  preferences?: string[];
};

export interface DiscoverFilters {
  species?: Species[];
  sizes?: PetSize[];
  maxDistanceKm?: number;
  traits?: PersonalityTrait[];
}

export interface DiscoverParams extends Coordinates {
  petId: string;
  filters?: DiscoverFilters;
}

export interface CreateLikeInput {
  fromPetId: string;
  toPetId: string;
  type: LikeType;
}

export interface LikeResult {
  like: Like;
  /** Present when the like produced a mutual match. */
  match: MatchSummary | null;
  /** Present for matches and premium direct messages. */
  conversationId: string | null;
}

export interface MatchSummary extends Match {
  /** The other pet in the match, from the active pet's perspective. */
  pet: Pet;
  conversationId: string;
  isNew: boolean;
}

export interface ConversationSummary {
  id: string;
  matchId: string | null;
  pet: Pet;
  lastMessage: Message | null;
  unreadCount: number;
}

export interface ConversationDetail {
  id: string;
  matchId: string | null;
  pet: Pet;
  myPet: Pet;
}

export interface SendMessageInput {
  type: Message['type'];
  text?: string;
  imageUrl?: string;
  playdate?: Omit<PlaydateInvite, 'id' | 'status'>;
}

export interface RespondPlaydateInput {
  messageId: string;
  status: Exclude<PlaydateStatus, 'pending'>;
}

/** A playdate invite across conversations ("Passeios" in the Chat tab). */
export interface PlaydateSummary {
  /** The invite message id. */
  id: string;
  conversationId: string;
  /** The other pet. */
  pet: Pet;
  /** `sent` when the user's pet invited. */
  direction: 'sent' | 'received';
  placeName: string;
  latitude: number;
  longitude: number;
  scheduledAt: string;
  status: PlaydateStatus;
}

export interface NearbyParams extends Coordinates {
  petId: string;
  radiusKm?: number;
}

export interface NearbyPin {
  id: string;
  /** Obfuscated display coordinate — never the real position. */
  latitude: number;
  longitude: number;
  species: Species;
  /** Locked pins hide identity for free users (premium: "ver pets sem match"). */
  locked: boolean;
  isMatch: boolean;
  pet: Pick<Pet, 'id' | 'name' | 'photos' | 'breed'> | null;
}

export interface NearbyResponse {
  total: number;
  pins: NearbyPin[];
}

export interface ReportInput {
  targetPetId: string;
  reason: ReportReason;
  details?: string;
}

export interface BoostResponse {
  expiresAt: string;
}

/**
 * Contract between the UI and the backend. Components and hooks depend only on this
 * interface, so the mock implementation can be swapped for the REST one transparently.
 */
export interface PetzApi {
  getMe(): Promise<MeResponse>;
  updateMe(input: UpdateMeInput): Promise<User>;
  /** Permanently deletes the account: login, pets, photos, matches and messages. */
  deleteAccount(): Promise<void>;

  createPet(input: CreatePetInput): Promise<Pet>;
  getPet(id: string): Promise<Pet>;
  updatePet(id: string, input: UpdatePetInput): Promise<Pet>;
  /** Removes the pet with its photos, likes, matches and conversations. */
  deletePet(id: string): Promise<void>;
  boostPet(id: string): Promise<BoostResponse>;

  getDiscover(params: DiscoverParams): Promise<Pet[]>;
  createLike(input: CreateLikeInput): Promise<LikeResult>;

  getMatches(petId: string): Promise<MatchSummary[]>;

  getConversations(petId: string): Promise<ConversationSummary[]>;
  getConversation(id: string): Promise<ConversationDetail>;
  getMessages(conversationId: string): Promise<Message[]>;
  sendMessage(conversationId: string, input: SendMessageInput): Promise<Message>;
  respondPlaydate(conversationId: string, input: RespondPlaydateInput): Promise<Message>;
  getPlaceSuggestions(params: Coordinates): Promise<PlaceSuggestion[]>;
  /** Upcoming playdates and the last 30 days, soonest first. */
  getPlaydates(petId: string): Promise<PlaydateSummary[]>;

  getNearby(params: NearbyParams): Promise<NearbyResponse>;

  reportPet(input: ReportInput): Promise<Report>;
  blockPet(petId: string): Promise<Block>;

  /** Mock/dev only hook for the subscription service; the real backend uses store webhooks. */
  setSubscriptionTier?(tier: User['subscriptionTier']): Promise<User>;
}
