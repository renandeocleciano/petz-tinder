import { create } from 'zustand';

import { DEFAULT_CITY, type City } from '@/constants/cities';
import type { Coordinates, DiscoverFilters } from '@/lib/api/types';

export type LocationStatus = 'unknown' | 'granted' | 'denied';

interface AppState {
  activePetId: string | null;
  city: City;
  /** Device location already reduced to ~1 km precision. Never an exact coordinate. */
  approximateLocation: Coordinates | null;
  locationStatus: LocationStatus;
  discoverFilters: DiscoverFilters;

  setActivePetId: (petId: string | null) => void;
  setCity: (city: City) => void;
  setApproximateLocation: (location: Coordinates | null, status: LocationStatus) => void;
  setDiscoverFilters: (filters: DiscoverFilters) => void;
  reset: () => void;
}

const initialState = {
  activePetId: null,
  city: DEFAULT_CITY,
  approximateLocation: null,
  locationStatus: 'unknown' as LocationStatus,
  discoverFilters: {},
};

export const useAppStore = create<AppState>()((set) => ({
  ...initialState,
  setActivePetId: (activePetId) => set({ activePetId }),
  setCity: (city) => set({ city, approximateLocation: null }),
  setApproximateLocation: (approximateLocation, locationStatus) =>
    set({ approximateLocation, locationStatus }),
  setDiscoverFilters: (discoverFilters) => set({ discoverFilters }),
  reset: () => set(initialState),
}));

/**
 * Where searches are centered: approximate device location, or the chosen city center.
 * Returns existing references (never a new object) so it is safe as a Zustand selector.
 */
export const selectSearchOrigin = (state: AppState): Coordinates =>
  state.approximateLocation ?? state.city;
