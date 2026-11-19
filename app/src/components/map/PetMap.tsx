import Mapbox, { Camera, MapView, MarkerView } from '@rnmapbox/maps';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';

import { env } from '@/config/env';
import type { Coordinates, NearbyPin } from '@/lib/api/types';

import { clusterPins } from './clusterPins';
import { ApproximateAreaMarker, ClusterMarker, PetPinMarker } from './MapMarkers';

if (env.mapboxAccessToken) void Mapbox.setAccessToken(env.mapboxAccessToken);

const INITIAL_ZOOM = 12.5;

export interface PetMapProps {
  center: Coordinates;
  pins: NearbyPin[];
  /** Approximate user area (already rounded). Null when the user picked a city manually. */
  userArea: Coordinates | null;
  onPinPress: (pin: NearbyPin) => void;
  recenterSignal: number;
}

export function PetMap({ center, pins, userArea, onPinPress, recenterSignal }: PetMapProps) {
  const [zoom, setZoom] = useState(INITIAL_ZOOM);
  const cameraRef = useRef<Camera>(null);
  const items = useMemo(() => clusterPins(pins, Math.round(zoom)), [pins, zoom]);
  const centerCoordinate = useMemo(() => [center.longitude, center.latitude], [center]);

  // Uncontrolled camera: only move it when the search origin changes or on "recenter".
  useEffect(() => {
    cameraRef.current?.setCamera({
      centerCoordinate,
      zoomLevel: INITIAL_ZOOM,
      animationDuration: 600,
    });
  }, [centerCoordinate, recenterSignal]);

  return (
    <MapView
      style={StyleSheet.absoluteFill}
      styleURL={Mapbox.StyleURL.Street}
      scaleBarEnabled={false}
      compassEnabled={false}
      attributionPosition={{ bottom: 8, left: 8 }}
      onMapIdle={(state) => setZoom(state.properties.zoom)}
    >
      <Camera ref={cameraRef} defaultSettings={{ centerCoordinate, zoomLevel: INITIAL_ZOOM }} />

      {userArea && (
        <MarkerView coordinate={[userArea.longitude, userArea.latitude]} allowOverlap>
          <ApproximateAreaMarker />
        </MarkerView>
      )}

      {items.map((item) => (
        <MarkerView key={item.id} coordinate={[item.longitude, item.latitude]} allowOverlap>
          {item.kind === 'pin' ? (
            <PetPinMarker pin={item.pin} onPress={() => onPinPress(item.pin)} />
          ) : (
            <ClusterMarker
              count={item.count}
              onPress={() =>
                cameraRef.current?.setCamera({
                  centerCoordinate: [item.longitude, item.latitude],
                  zoomLevel: Math.min(zoom + 2, 17),
                  animationDuration: 400,
                })
              }
            />
          )}
        </MarkerView>
      ))}
    </MapView>
  );
}
