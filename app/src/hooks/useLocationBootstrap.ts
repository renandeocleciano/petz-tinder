import { useEffect } from 'react';

import { requestApproximateLocation } from '@/services/location';
import { useAppStore } from '@/store/appStore';

/**
 * Asks for location once per session. Denial never blocks the app: the user keeps
 * browsing with the manually selected city.
 */
export const useLocationBootstrap = (enabled: boolean) => {
  const status = useAppStore((s) => s.locationStatus);
  const setApproximateLocation = useAppStore((s) => s.setApproximateLocation);
  const setCity = useAppStore((s) => s.setCity);

  useEffect(() => {
    if (!enabled || status !== 'unknown') return;
    let cancelled = false;
    requestApproximateLocation().then((result) => {
      if (cancelled) return;
      if (result.status === 'granted') {
        setCity(result.nearestCity);
        setApproximateLocation(result.location, 'granted');
      } else {
        setApproximateLocation(null, 'denied');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, status, setApproximateLocation, setCity]);
};
