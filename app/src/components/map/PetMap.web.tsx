import { MapUnavailable } from './MapUnavailable';
import type { PetMapProps } from './PetMap';

/** Mapbox native SDK is mobile-only; the web preview shows a placeholder. */
export function PetMap(_props: PetMapProps) {
  return <MapUnavailable />;
}
