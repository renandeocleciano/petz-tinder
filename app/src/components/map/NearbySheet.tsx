import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { PetAvatar } from '@/components/pet/PetAvatar';
import { PremiumUpsell } from '@/components/premium/PremiumUpsell';
import { AppText } from '@/components/ui/AppText';
import type { NearbyPin, NearbyResponse } from '@/lib/api/types';
import { colors, radius, shadows, spacing } from '@/theme';

import { LockedPetsRow, NearbyPetRow } from './NearbyPetRow';
import { clampSheetHeight, snapSheetHeight } from './sheetSnap';

interface NearbySheetProps {
  nearby: NearbyResponse | undefined;
  isPremium: boolean;
  onUpgrade: () => void;
  onPetPress: (pin: NearbyPin) => void;
  /** Height when fully open; 0 until the map area has been measured. */
  maxHeight: number;
}

const SPRING = { damping: 22, stiffness: 220 };

/**
 * Bottom sheet over the map. Collapsed it shows the summary; dragging the top (or tapping
 * it) opens the list of nearby pets, closest first.
 */
export function NearbySheet({
  nearby,
  isPremium,
  onUpgrade,
  onPetPress,
  maxHeight,
}: NearbySheetProps) {
  const total = nearby?.total ?? 0;
  const pins = nearby?.pins ?? [];
  const unlocked = pins.filter((p) => p.pet);
  const lockedCount = pins.length - unlocked.length;
  const visible = unlocked.slice(0, 4);
  const extra = total - visible.length;

  /** Collapsed height (measured header); 0 means "not measured yet, size to content". */
  const collapsed = useSharedValue(0);
  const height = useSharedValue(0);
  const dragStart = useSharedValue(0);
  const expanded = Math.max(maxHeight, 0);
  // The list renders only once the header is measured, so it never stretches the sheet.
  const [measured, setMeasured] = useState(false);

  const pan = Gesture.Pan()
    .activeOffsetY([-8, 8])
    .onBegin(() => {
      dragStart.set(height.get());
    })
    .onUpdate((event) => {
      if (collapsed.get() === 0) return;
      const max = Math.max(expanded, collapsed.get());
      height.set(clampSheetHeight(dragStart.get() - event.translationY, collapsed.get(), max));
    })
    .onEnd((event) => {
      if (collapsed.get() === 0) return;
      const max = Math.max(expanded, collapsed.get());
      height.set(
        withSpring(snapSheetHeight(height.get(), event.velocityY, collapsed.get(), max), SPRING),
      );
    });

  const toggle = () => {
    if (collapsed.get() === 0) return;
    const isOpen = height.get() > collapsed.get() + 1;
    height.set(withSpring(isOpen ? collapsed.get() : Math.max(expanded, collapsed.get()), SPRING));
  };

  const animatedStyle = useAnimatedStyle(() =>
    collapsed.get() === 0 ? {} : { height: height.get() },
  );

  return (
    <Animated.View style={[styles.sheet, animatedStyle]}>
      <GestureDetector gesture={pan}>
        <View
          collapsable={false}
          onLayout={(event) => {
            const next = event.nativeEvent.layout.height;
            const wasOpen = collapsed.get() > 0 && height.get() > collapsed.get() + 1;
            collapsed.set(next);
            if (!wasOpen) height.set(next);
            setMeasured(true);
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mostrar ou esconder a lista de pets por perto"
            onPress={toggle}
            style={styles.top}
            testID="nearby-sheet-toggle"
          >
            <View style={styles.handle} />
            <View style={styles.header}>
              <View style={styles.flex}>
                <AppText variant="heading" testID="nearby-count">
                  {total} {total === 1 ? 'pet por perto' : 'pets por perto'}
                </AppText>
                <AppText variant="caption" color="textSecondary">
                  Veja quem está passeando na sua região!
                </AppText>
              </View>
              <View style={styles.avatars}>
                {visible.map((pin, index) => (
                  <View key={pin.id} style={index > 0 && styles.overlap}>
                    <PetAvatar uri={pin.pet?.photos[0]} size={40} ringColor={colors.surface} />
                  </View>
                ))}
                {extra > 0 && (
                  <View style={[styles.more, visible.length > 0 && styles.overlap]}>
                    <AppText variant="caption">+{extra}</AppText>
                  </View>
                )}
              </View>
            </View>
          </Pressable>
          {!isPremium && (
            <View style={styles.upsell}>
              <PremiumUpsell onUpgrade={onUpgrade} />
            </View>
          )}
        </View>
      </GestureDetector>
      {measured && (
        <FlatList
          data={unlocked}
          keyExtractor={(pin) => pin.id}
          renderItem={({ item }) => <NearbyPetRow pin={item} onPress={() => onPetPress(item)} />}
          ItemSeparatorComponent={Separator}
          ListHeaderComponent={
            unlocked.length > 0 ? (
              <AppText variant="caption" color="textSecondary">
                Mais próximos primeiro
              </AppText>
            ) : null
          }
          ListEmptyComponent={
            lockedCount === 0 ? (
              <AppText color="textSecondary" align="center">
                Nenhum pet por perto agora.
              </AppText>
            ) : null
          }
          ListFooterComponent={
            <>
              {lockedCount > 0 && <LockedPetsRow count={lockedCount} onPress={onUpgrade} />}
              {total > pins.length && (
                <AppText variant="caption" color="textSecondary" align="center">
                  Mostrando os {pins.length} mais próximos
                </AppText>
              )}
            </>
          }
          ListHeaderComponentStyle={styles.listHeader}
          ListFooterComponentStyle={styles.listFooter}
          contentContainerStyle={styles.list}
          style={styles.flex}
          testID="nearby-list"
        />
      )}
    </Animated.View>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    overflow: 'hidden',
    ...shadows.lg,
  },
  top: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  upsell: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  avatars: { flexDirection: 'row', alignItems: 'center' },
  overlap: { marginLeft: -12 },
  more: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  listHeader: { marginBottom: spacing.sm },
  listFooter: { marginTop: spacing.sm, gap: spacing.sm },
  separator: { height: spacing.sm },
});
