import { ActivityIndicator, Pressable, View } from 'react-native';

import { colors, shadows } from '@/theme';

import { AppText } from './AppText';
import { Icon } from './Icon';
import { styles, type ButtonProps } from './PrimaryButton';

type SecondaryVariant = 'surface' | 'outline';

/** White surface (e.g. "Continuar com Google") or teal outline (e.g. "Outras sugestões"). */
export function SecondaryButton({
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
  variant = 'surface',
}: ButtonProps & { variant?: SecondaryVariant }) {
  const isDisabled = disabled || loading;
  const foreground = variant === 'outline' ? colors.teal : colors.text;
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
        variant === 'surface'
          ? [{ backgroundColor: colors.surface }, shadows.sm]
          : { borderWidth: 1.5, borderColor: colors.teal, backgroundColor: colors.surface },
        pressed && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <View style={styles.content}>
          {leading}
          {icon && <Icon name={icon} size={22} color={foreground} />}
          <AppText variant={compact ? 'bodyStrong' : 'button'} style={{ color: foreground }}>
            {label}
          </AppText>
          {trailingIcon && <Icon name={trailingIcon} size={20} color={foreground} />}
        </View>
      )}
    </Pressable>
  );
}
