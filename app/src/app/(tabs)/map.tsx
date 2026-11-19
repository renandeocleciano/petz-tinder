import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { MapUnavailable } from '@/components/map/MapUnavailable';
import { NearbySheet } from '@/components/map/NearbySheet';
import { isExpoGo, loadPetMap } from '@/components/map/loadPetMap';
import { Chip } from '@/components/ui/Chip';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { env } from '@/config/env';
import { useNearby } from '@/hooks/useNearby';
import { usePremiumGate } from '@/hooks/usePremium';
import type { NearbyPin } from '@/lib/api';
import { selectSearchOrigin, useAppStore } from '@/store/appStore';
import { colors, layout, spacing } from '@/theme';
import type { Species } from '@/types/domain';

type MapFilter = 'all' | Species;

const PetMap = loadPetMap();

const FILTERS: { value: MapFilter; label: string; icon: 'paw' | 'dog' | 'cat' }[] = [
  { value: 'all', label: 'Todos', icon: 'paw' },
  { value: 'dog', label: 'Cães', icon: 'dog' },
  { value: 'cat', label: 'Gatos', icon: 'cat' },
];

export default function MapScreen() {
  const router = useRouter();
  const nearby = useNearby();
  const { isPremium, requirePremium } = usePremiumGate();
  const origin = useAppStore(selectSearchOrigin);
  const userArea = useAppStore((s) => s.approximateLocation);
  const [filter, setFilter] = useState<MapFilter>('all');
  const [recenter, setRecenter] = useState(0);
  const [mapHeight, setMapHeight] = useState(0);

  const pins = (nearby.data?.pins ?? []).filter((p) => filter === 'all' || p.species === filter);

  const onPinPress = (pin: NearbyPin) => {
    if (pin.locked) {
      requirePremium('see_unmatched_on_map');
      return;
    }
    router.push({ pathname: '/pet/[id]', params: { id: pin.id } });
  };

  return (
    <Screen>
      <ScreenHeader />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
        style={styles.filtersBar}
      >
        {FILTERS.map((f) => (
          <Chip
            key={f.value}
            label={f.label}
            icon={f.icon}
            selected={filter === f.value}
            onPress={() => setFilter(f.value)}
          />
        ))}
      </ScrollView>

      <View
        style={styles.mapArea}
        onLayout={(event) => setMapHeight(event.nativeEvent.layout.height)}
      >
        {PetMap && env.mapboxAccessToken ? (
          <PetMap
            center={origin}
            pins={pins}
            userArea={userArea}
            onPinPress={onPinPress}
            recenterSignal={recenter}
          />
        ) : (
          <MapUnavailable reason={isExpoGo ? 'expo-go' : 'missing-token'} />
        )}
        <IconButton
          icon="crosshairs-gps"
          accessibilityLabel="Centralizar no mapa"
          onPress={() => setRecenter((n) => n + 1)}
          size={52}
          style={styles.recenter}
        />
        <View style={styles.sheet}>
          <NearbySheet
            nearby={nearby.data}
            isPremium={isPremium}
            onPetPress={onPinPress}
            maxHeight={mapHeight - SHEET_BOTTOM - spacing.lg}
            onUpgrade={() =>
              router.push({ pathname: '/premium', params: { feature: 'see_unmatched_on_map' } })
            }
          />
        </View>
      </View>
    </Screen>
  );
}

/** The sheet sits just above the floating tab bar. */
const SHEET_BOTTOM = layout.tabBarHeight - 24;

const styles = StyleSheet.create({
  filtersBar: { flexGrow: 0 },
  filters: { gap: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  mapArea: { flex: 1, backgroundColor: colors.mint },
  recenter: { position: 'absolute', right: spacing.xl, top: spacing.lg },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: SHEET_BOTTOM },
});
