import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { CITIES, type City } from '@/constants/cities';
import { useAppStore } from '@/store/appStore';
import { colors, radius, shadows, spacing } from '@/theme';

import { AppText } from './AppText';
import { Icon } from './Icon';
import { Sheet } from './Sheet';

interface CityPickerProps {
  visible: boolean;
  selectedId: string;
  onSelect: (city: City) => void;
  onClose: () => void;
}

export function CityPicker({ visible, selectedId, onSelect, onClose }: CityPickerProps) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Escolha sua cidade">
      <FlatList
        data={CITIES}
        keyExtractor={(city) => city.id}
        renderItem={({ item }) => {
          const selected = item.id === selectedId;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => {
                onSelect(item);
                onClose();
              }}
              style={styles.cityRow}
            >
              <Icon
                name="map-marker"
                size={20}
                color={selected ? colors.coral : colors.textSecondary}
              />
              <AppText variant={selected ? 'bodyStrong' : 'body'} style={styles.cityName}>
                {item.name}
              </AppText>
              {selected && <Icon name="check" size={20} color={colors.coral} />}
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </Sheet>
  );
}

/** Pill showing the current search city. Picking a city replaces the device location. */
export function LocationSelector() {
  const city = useAppStore((s) => s.city);
  const setCity = useAppStore((s) => s.setCity);
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Cidade: ${city.name}. Alterar`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.pill, pressed && { opacity: 0.85 }]}
      >
        <Icon name="map-marker" size={18} color={colors.coral} />
        <AppText variant="bodyStrong" numberOfLines={1} style={styles.label}>
          {city.name}
        </AppText>
        <Icon name="chevron-down" size={18} color={colors.text} />
      </Pressable>
      <CityPicker
        visible={open}
        selectedId={city.id}
        onSelect={setCity}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    maxWidth: 190,
    ...shadows.sm,
  },
  label: { flexShrink: 1 },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md + 2,
  },
  cityName: { flex: 1 },
  separator: { height: 1, backgroundColor: colors.border },
});
