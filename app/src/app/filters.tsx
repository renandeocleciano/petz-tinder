import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Chip } from '@/components/ui/Chip';
import { IconButton } from '@/components/ui/IconButton';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { SIZE_OPTIONS, SPECIES_OPTIONS, TRAIT_OPTIONS } from '@/constants/pet';
import type { DiscoverFilters } from '@/lib/api';
import { useAppStore } from '@/store/appStore';
import { colors, spacing } from '@/theme';

const DISTANCES = [2, 5, 10, 25];

const toggle = <T,>(list: T[] | undefined, value: T): T[] =>
  list?.includes(value) ? list.filter((item) => item !== value) : [...(list ?? []), value];

/** Premium-only advanced filters for Discover (gated before navigation and on the API). */
export default function FiltersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const current = useAppStore((s) => s.discoverFilters);
  const setFilters = useAppStore((s) => s.setDiscoverFilters);
  const [draft, setDraft] = useState<DiscoverFilters>(current);

  const apply = () => {
    const cleaned = Object.fromEntries(
      Object.entries(draft).filter(([, value]) =>
        Array.isArray(value) ? value.length > 0 : value !== undefined,
      ),
    ) as DiscoverFilters;
    setFilters(cleaned);
    router.back();
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <IconButton icon="close" accessibilityLabel="Fechar" onPress={() => router.back()} />
        <AppText variant="heading">Filtros avançados</AppText>
        <View style={styles.side} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="subheading">Espécie</AppText>
        <View style={styles.wrap}>
          {SPECIES_OPTIONS.map((o) => (
            <Chip
              key={o.value}
              label={o.label}
              icon={o.icon}
              selected={draft.species?.includes(o.value)}
              onPress={() => setDraft((d) => ({ ...d, species: toggle(d.species, o.value) }))}
            />
          ))}
        </View>

        <AppText variant="subheading">Porte</AppText>
        <View style={styles.wrap}>
          {SIZE_OPTIONS.map((o) => (
            <Chip
              key={o.value}
              label={o.label}
              tone="coral"
              selected={draft.sizes?.includes(o.value)}
              onPress={() => setDraft((d) => ({ ...d, sizes: toggle(d.sizes, o.value) }))}
            />
          ))}
        </View>

        <AppText variant="subheading">Personalidade</AppText>
        <View style={styles.wrap}>
          {TRAIT_OPTIONS.map((o) => (
            <Chip
              key={o.value}
              label={o.label}
              icon={o.icon}
              tone={o.tone}
              selected={draft.traits?.includes(o.value)}
              onPress={() => setDraft((d) => ({ ...d, traits: toggle(d.traits, o.value) }))}
            />
          ))}
        </View>

        <AppText variant="subheading">Distância máxima</AppText>
        <View style={styles.wrap}>
          {DISTANCES.map((km) => (
            <Chip
              key={km}
              label={`${km} km`}
              tone="orange"
              selected={draft.maxDistanceKm === km}
              onPress={() =>
                setDraft((d) => ({ ...d, maxDistanceKm: d.maxDistanceKm === km ? undefined : km }))
              }
            />
          ))}
        </View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <SecondaryButton label="Limpar" onPress={() => setDraft({})} style={styles.flex} />
        <PrimaryButton label="Aplicar" onPress={apply} style={styles.flex} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  side: { width: 44 },
  content: { padding: spacing.xl, gap: spacing.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  flex: { flex: 1 },
});
