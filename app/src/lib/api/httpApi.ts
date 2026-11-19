import { placeSuggestions } from '@/constants/places';
import { distanceKm } from '@/utils/geo';

import { unavailable } from './errors';
import { createRequest } from './http/client';
import type {
  BlockDto,
  ConversationDetailDto,
  ConversationSummaryDto,
  DiscoveryPetDto,
  LikeDto,
  MatchDto,
  MessageDto,
  NearbyPinDto,
  Page,
  PetDto,
  PlaydateSummaryDto,
  ReportDto,
  UserDto,
} from './http/contract';
import {
  toBackendReportReason,
  toConversationSummary,
  toLike,
  toMatchSummary,
  toMessage,
  toNearbyPin,
  toPet,
  toPlaydateSummary,
  toUser,
} from './http/mappers';
import { createUploader, isLocalUri } from './http/uploads';
import type { CreatePetInput, PetzApi, SendMessageInput, UpdatePetInput } from './types';

/** First page sizes: the screens do not paginate yet. */
const LIST_LIMIT = 50;
const MESSAGES_LIMIT = 100;

/**
 * REST implementation of PetzApi over the Petz backend (`/v1`). Screens only see domain
 * types: every backend difference (routes, envelopes, uploads, ids) is absorbed here.
 */
export const createHttpApi = (baseUrl: string): PetzApi => {
  const request = createRequest(baseUrl);
  const upload = createUploader(request);

  const fetchPet = async (id: string) => (await request<{ pet: PetDto }>('GET', `/pets/${id}`)).pet;

  /** Uploads local images; already uploaded URLs are not sent again. */
  const uploadNewPhotos = async (photos: string[]) => {
    const paths: string[] = [];
    for (const uri of photos.filter(isLocalUri)) paths.push(await upload('pet_photo', uri));
    return paths;
  };

  /** The backend takes either an exact birth date or an approximate age. */
  const ageFields = (input: Pick<CreatePetInput, 'age' | 'birthDate'>) =>
    input.birthDate ? { birthDate: input.birthDate } : { approximateAgeYears: input.age };

  /** Applies a new photo list: removes dropped photos, uploads and links new ones. */
  const syncPhotos = async (petId: string, photos: string[]) => {
    const current = await fetchPet(petId);
    const kept = new Set(photos.filter((uri) => !isLocalUri(uri)));
    for (const photo of current.photos.filter((p) => !kept.has(p.url))) {
      await request('DELETE', `/pets/${petId}/photos/${photo.id}`);
    }
    for (const path of await uploadNewPhotos(photos)) {
      await request('POST', `/pets/${petId}/photos`, { path });
    }
  };

  const messageBody = async (input: SendMessageInput) => {
    const caption = input.text?.trim() ? { text: input.text.trim() } : {};
    if (input.type === 'image') {
      if (!input.imageUrl) throw unavailable('Envio de imagem sem arquivo');
      return { type: 'image', imagePath: await upload('chat_media', input.imageUrl), ...caption };
    }
    if (input.type === 'playdate_invite') {
      if (!input.playdate) throw unavailable('Convite sem detalhes');
      const { placeName, latitude, longitude, scheduledAt } = input.playdate;
      return {
        type: 'playdate_invite',
        playdate: { placeName, latitude, longitude, scheduledAt },
        ...caption,
      };
    }
    return { type: 'text', text: input.text ?? '' };
  };

  /** Block and report target the pet's owner (`ownerId`), not the pet. */
  const ownerOf = async (petId: string) => (await fetchPet(petId)).ownerId;

  return {
    async getMe() {
      const { user, pets } = await request<{ user: UserDto; pets: PetDto[] }>('GET', '/users/me');
      return { user: toUser(user), pets: pets.map((pet) => toPet(pet)) };
    },

    async updateMe({ name, avatarUrl, pushToken }) {
      const avatarPath =
        avatarUrl === null
          ? null
          : avatarUrl && isLocalUri(avatarUrl)
            ? await upload('user_avatar', avatarUrl)
            : undefined;
      const { user } = await request<{ user: UserDto }>('PATCH', '/users/me', {
        ...(name !== undefined ? { name } : {}),
        ...(avatarPath !== undefined ? { avatarPath } : {}),
        ...(pushToken ? { pushToken } : {}),
      });
      return toUser(user);
    },

    deleteAccount: async () => {
      await request('DELETE', '/users/me');
    },

    async createPet(input) {
      const photoPaths = await uploadNewPhotos(input.photos);
      const { pet } = await request<{ pet: PetDto }>('POST', '/pets', {
        name: input.name,
        species: input.species,
        breed: input.breed,
        ...ageFields(input),
        gender: input.gender,
        size: input.size,
        neutered: input.neutered,
        bio: input.bio ?? '',
        city: input.city,
        latitude: input.latitude,
        longitude: input.longitude,
        personalityTraits: input.personalityTraits,
        interests: input.interests ?? [],
        availability: input.availability ?? null,
        photoPaths,
      });
      return toPet(pet);
    },

    getPet: async (id) => toPet(await fetchPet(id)),

    async updatePet(id, input: UpdatePetInput) {
      // `coverUrl` is not supported: the cover is the first photo.
      const { photos, age, birthDate, coverUrl: _coverUrl, ...fields } = input;
      const body: Record<string, unknown> = { ...fields };
      if (birthDate) body.birthDate = birthDate;
      else if (age !== undefined) body.approximateAgeYears = age;
      if (photos) await syncPhotos(id, photos);
      if (Object.keys(body).length === 0) return toPet(await fetchPet(id));
      const { pet } = await request<{ pet: PetDto }>('PATCH', `/pets/${id}`, body);
      return toPet(pet);
    },

    deletePet: async (id) => {
      await request('DELETE', `/pets/${id}`);
    },

    boostPet: async () => {
      throw unavailable('O boost de perfil');
    },

    async getDiscover({ petId, latitude, longitude, filters }) {
      const page = await request<Page<DiscoveryPetDto>>('GET', '/discovery', undefined, {
        petId,
        latitude,
        longitude,
        radiusKm: filters?.maxDistanceKm,
        species: filters?.species,
        size: filters?.sizes,
        traits: filters?.traits,
        limit: LIST_LIMIT,
      });
      return page.data.map((pet) => toPet(pet, pet.distanceMeters));
    },

    async createLike({ fromPetId, toPetId, type }) {
      if (type === 'direct_message') throw unavailable('A mensagem direta');
      const { like, match } = await request<{ like: LikeDto; match: MatchDto | null }>(
        'POST',
        '/likes',
        { fromPetId, toPetId, type },
      );
      return {
        like: toLike(like),
        match: match ? toMatchSummary(match) : null,
        conversationId: match?.conversationId ?? null,
      };
    },

    async getMatches(petId) {
      const [matches, conversations] = await Promise.all([
        request<Page<MatchDto>>('GET', '/matches', undefined, { petId, limit: LIST_LIMIT }),
        request<Page<ConversationSummaryDto>>('GET', '/conversations', undefined, {
          petId,
          limit: LIST_LIMIT,
        }),
      ]);
      const byId = new Map(conversations.data.map((c) => [c.id, c]));
      return matches.data.map((match) => toMatchSummary(match, byId.get(match.conversationId)));
    },

    async getConversations(petId) {
      const page = await request<Page<ConversationSummaryDto>>('GET', '/conversations', undefined, {
        petId,
        limit: LIST_LIMIT,
      });
      return page.data.map(toConversationSummary);
    },

    async getConversation(id) {
      const { conversation } = await request<{ conversation: ConversationDetailDto }>(
        'GET',
        `/conversations/${id}`,
      );
      return {
        id: conversation.id,
        matchId: conversation.matchId,
        pet: toPet(conversation.pet),
        myPet: toPet(conversation.myPet),
      };
    },

    async getMessages(conversationId) {
      const page = await request<Page<MessageDto>>(
        'GET',
        `/conversations/${conversationId}/messages`,
        undefined,
        { limit: MESSAGES_LIMIT },
      );
      // Loading the thread counts as reading it (same as the mock).
      await request('POST', `/conversations/${conversationId}/read`);
      // The backend pages newest first; the chat renders oldest first.
      return page.data.map(toMessage).reverse();
    },

    async sendMessage(conversationId, input) {
      const { message } = await request<{ message: MessageDto }>(
        'POST',
        `/conversations/${conversationId}/messages`,
        await messageBody(input),
      );
      return toMessage(message);
    },

    async respondPlaydate(conversationId, { messageId, status }) {
      const { message } = await request<{ message: MessageDto }>(
        'PATCH',
        `/conversations/${conversationId}/messages/${messageId}/playdate`,
        { status },
      );
      return toMessage(message);
    },

    // The backend has no place catalogue yet: public places bundled with the app, nearest first.
    getPlaceSuggestions: async (origin) =>
      [...placeSuggestions].sort((a, b) => distanceKm(origin, a) - distanceKm(origin, b)),

    async getPlaydates(petId) {
      const { data } = await request<{ data: PlaydateSummaryDto[] }>(
        'GET',
        '/playdates',
        undefined,
        {
          petId,
        },
      );
      return data.map(toPlaydateSummary);
    },

    async getNearby({ petId, latitude, longitude, radiusKm }) {
      const { total, data } = await request<{ total: number; data: NearbyPinDto[] }>(
        'GET',
        '/discovery/nearby',
        undefined,
        { petId, latitude, longitude, radiusKm },
      );
      return { total, pins: data.map(toNearbyPin) };
    },

    async reportPet({ targetPetId, reason, details }) {
      const { report } = await request<{ report: ReportDto }>('POST', '/reports', {
        targetUserId: await ownerOf(targetPetId),
        targetPetId,
        reason: toBackendReportReason(reason),
        ...(details?.trim() ? { description: details.trim() } : {}),
      });
      return {
        id: report.id,
        reporterUserId: '',
        targetPetId,
        reason,
        createdAt: report.createdAt,
      };
    },

    async blockPet(petId) {
      const { block } = await request<{ block: BlockDto }>('POST', '/blocks', {
        targetUserId: await ownerOf(petId),
      });
      return {
        id: block.userId,
        blockerUserId: '',
        blockedPetId: petId,
        createdAt: block.createdAt,
      };
    },

    /** Dev builds only: the backend answers 404 in production. */
    async setSubscriptionTier(tier) {
      await request('POST', '/dev/subscription', { tier });
      return toUser((await request<{ user: UserDto }>('GET', '/users/me')).user);
    },
  };
};
