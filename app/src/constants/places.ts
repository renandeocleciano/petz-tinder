import type { PlaceSuggestion } from '@/types/domain';

/**
 * Public places for playdate invites (Rio de Janeiro). Used until the backend offers
 * `GET /v1/places/suggestions`. Never a tutor's home: only parks and squares.
 */
export const placeSuggestions: PlaceSuggestion[] = [
  {
    id: 'place-lage',
    name: 'Parque Lage',
    imageUrl: null,
    latitude: -22.9597,
    longitude: -43.2116,
  },
  {
    id: 'place-lagoa',
    name: 'Lagoa Rodrigo de Freitas',
    imageUrl: null,
    latitude: -22.9733,
    longitude: -43.2105,
  },
  {
    id: 'place-aterro',
    name: 'Aterro do Flamengo',
    imageUrl: null,
    latitude: -22.9318,
    longitude: -43.1722,
  },
  {
    id: 'place-paz',
    name: 'Praça Nossa Senhora da Paz',
    imageUrl: null,
    latitude: -22.9846,
    longitude: -43.2071,
  },
  {
    id: 'place-catacumba',
    name: 'Parque da Catacumba',
    imageUrl: null,
    latitude: -22.9725,
    longitude: -43.2006,
  },
];
