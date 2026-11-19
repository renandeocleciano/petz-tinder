import type { DiscoverFilters } from './types';

export const queryKeys = {
  me: ['me'] as const,
  pet: (id: string) => ['pets', id] as const,
  discover: (petId: string, city: string, filters: DiscoverFilters) =>
    ['discover', petId, city, filters] as const,
  discoverRoot: ['discover'] as const,
  matches: (petId: string) => ['matches', petId] as const,
  matchesRoot: ['matches'] as const,
  conversations: (petId: string) => ['conversations', petId] as const,
  conversationsRoot: ['conversations'] as const,
  conversation: (id: string) => ['conversation', id] as const,
  messages: (conversationId: string) => ['messages', conversationId] as const,
  places: (lat: number, lng: number) => ['places', lat, lng] as const,
  playdates: (petId: string) => ['playdates', petId] as const,
  playdatesRoot: ['playdates'] as const,
  nearby: (petId: string, lat: number, lng: number) => ['nearby', petId, lat, lng] as const,
  nearbyRoot: ['nearby'] as const,
};
