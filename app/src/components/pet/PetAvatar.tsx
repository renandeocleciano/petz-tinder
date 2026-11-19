import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { colors } from '@/theme';

interface PetAvatarProps {
  uri: string | null | undefined;
  size?: number;
  /** Colored ring, e.g. coral for new matches. */
  ringColor?: string;
  online?: boolean;
  accessibilityLabel?: string;
}

export function PetAvatar({
  uri,
  size = 56,
  ringColor,
  online,
  accessibilityLabel,
}: PetAvatarProps) {
  const ring = ringColor ? 3 : 0;
  const inner = size - ring * 2 - (ringColor ? 4 : 0);
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessible={Boolean(accessibilityLabel)}
      style={[
        styles.ring,
        { width: size, height: size, borderRadius: size / 2 },
        ringColor ? { borderWidth: ring, borderColor: ringColor } : null,
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: inner, height: inner, borderRadius: inner / 2 }}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <View
          style={[styles.placeholder, { width: inner, height: inner, borderRadius: inner / 2 }]}
        >
          <Icon name="paw" size={inner * 0.45} color={colors.coral} />
        </View>
      )}
      {online ? (
        <View
          style={[
            styles.online,
            { width: size * 0.24, height: size * 0.24, borderRadius: size * 0.12 },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  placeholder: {
    backgroundColor: colors.coralSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  online: {
    position: 'absolute',
    right: 1,
    bottom: 1,
    backgroundColor: colors.online,
    borderWidth: 2.5,
    borderColor: colors.surface,
  },
});
