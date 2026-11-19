import { Pressable, StyleSheet } from 'react-native';

import { colors, radius, spacing, tones, type Tone } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

interface ChipProps {
  label: string;
  icon?: IconName;
  tone?: Tone;
  selected?: boolean;
  onPress?: () => void;
  testID?: string;
}

/** Selectable pill used in forms and filters. Unselected chips stay neutral. */
export function Chip({ label, icon, tone = 'teal', selected = false, onPress, testID }: ChipProps) {
  const palette = selected ? tones[tone] : { background: colors.surface, foreground: colors.text };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: palette.background },
        selected ? { borderColor: palette.foreground } : styles.unselected,
        pressed && styles.pressed,
      ]}
    >
      {icon && <Icon name={icon} size={18} color={palette.foreground} />}
      <AppText variant="bodyStrong" style={{ color: palette.foreground }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.lg - 2,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  unselected: { borderColor: colors.border },
  pressed: { opacity: 0.85 },
});
