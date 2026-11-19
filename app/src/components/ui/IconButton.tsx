import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, layout, shadows } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

interface IconButtonProps {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
  iconSize?: number;
  color?: string;
  background?: string;
  badge?: number;
  elevated?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  size = 44,
  iconSize = 22,
  color = colors.text,
  background = colors.surface,
  badge,
  elevated = true,
  style,
  testID,
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      hitSlop={layout.hitSlop}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: background },
        elevated && shadows.sm,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Icon name={icon} size={iconSize} color={color} />
      {badge ? (
        <View style={styles.badge}>
          <AppText variant="small" color="textInverse">
            {badge > 99 ? '99+' : badge}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center' },
  pressed: { transform: [{ scale: 0.94 }] },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: colors.coral,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
