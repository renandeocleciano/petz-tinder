import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, layout, radius, shadows, spacing } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export type ButtonTone = 'coral' | 'teal' | 'dark';

const BACKGROUND: Record<ButtonTone, string> = {
  coral: colors.coral,
  teal: colors.teal,
  dark: colors.text,
};

export interface ButtonProps {
  label: string;
  onPress: () => void;
  icon?: IconName;
  leading?: ReactNode;
  trailingIcon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
  compact?: boolean;
}

export function PrimaryButton({
  label,
  onPress,
  icon,
  leading,
  trailingIcon,
  loading,
  disabled,
  style,
  testID,
  compact,
  tone = 'coral',
}: ButtonProps & { tone?: ButtonTone }) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        shadows.md,
        { backgroundColor: BACKGROUND[tone] },
        pressed && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.textInverse} />
      ) : (
        <View style={styles.content}>
          {leading}
          {icon && <Icon name={icon} size={22} color={colors.textInverse} />}
          <AppText variant="button" color="textInverse">
            {label}
          </AppText>
          {trailingIcon && <Icon name={trailingIcon} size={22} color={colors.textInverse} />}
        </View>
      )}
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  base: {
    height: layout.buttonHeight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compact: { height: 44, paddingHorizontal: spacing.lg },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  disabled: { opacity: 0.5 },
});
