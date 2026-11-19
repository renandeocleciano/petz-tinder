import * as Location from 'expo-location';

import { CITIES, type City } from '@/constants/cities';
import type { Coordinates } from '@/lib/api/types';
import { approximate, distanceKm } from '@/utils/geo';

export type LocationResult =
  { status: 'granted'; location: Coordinates; nearestCity: City } | { status: 'denied' };

const nearestCity = (coords: Coordinates): City =>
  CITIES.reduce((best, city) =>
    distanceKm(coords, city) < distanceKm(coords, best) ? city : best,
  );

/**
 * Asks for foreground permission and returns an approximate location. The exact reading
 * is discarded immediately after rounding — it is never stored, sent or displayed.
 */
export const requestApproximateLocation = async (): Promise<LocationResult> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== Location.PermissionStatus.GRANTED) return { status: 'denied' };

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Low,
    });
    const location = approximate(position.coords);
    return { status: 'granted', location, nearestCity: nearestCity(location) };
  } catch {
    return { status: 'denied' };
  }
};
