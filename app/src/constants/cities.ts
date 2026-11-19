import type { Coordinates } from '@/lib/api/types';

export interface City extends Coordinates {
  id: string;
  name: string;
}

/** City centers used when location permission is denied (manual selection). */
export const CITIES: City[] = [
  { id: 'rio', name: 'Rio de Janeiro', latitude: -22.9711, longitude: -43.1951 },
  { id: 'sao-paulo', name: 'São Paulo', latitude: -23.5614, longitude: -46.6559 },
  { id: 'belo-horizonte', name: 'Belo Horizonte', latitude: -19.9245, longitude: -43.9352 },
  { id: 'brasilia', name: 'Brasília', latitude: -15.7939, longitude: -47.8828 },
  { id: 'curitiba', name: 'Curitiba', latitude: -25.4284, longitude: -49.2733 },
  { id: 'porto-alegre', name: 'Porto Alegre', latitude: -30.0346, longitude: -51.2177 },
  { id: 'salvador', name: 'Salvador', latitude: -12.9777, longitude: -38.5016 },
  { id: 'recife', name: 'Recife', latitude: -8.0476, longitude: -34.877 },
  { id: 'florianopolis', name: 'Florianópolis', latitude: -27.5954, longitude: -48.548 },
  { id: 'fortaleza', name: 'Fortaleza', latitude: -3.7319, longitude: -38.5267 },
];

export const DEFAULT_CITY: City = CITIES[0] as City;
