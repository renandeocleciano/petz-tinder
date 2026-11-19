import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { ComponentType } from 'react';

import type { PetMapProps } from './PetMap';

export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let cached: ComponentType<PetMapProps> | null | undefined;

/**
 * Loads the Mapbox map only when its native code exists. `@rnmapbox/maps` throws at
 * import time in Expo Go, so it can't be imported statically by the map route.
 * Returns null when unavailable; the screen then shows a placeholder.
 */
export const loadPetMap = (): ComponentType<PetMapProps> | null => {
  if (cached !== undefined) return cached;
  if (isExpoGo) {
    cached = null;
    return cached;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = (require('./PetMap') as typeof import('./PetMap')).PetMap;
  } catch {
    cached = null;
  }
  return cached;
};
