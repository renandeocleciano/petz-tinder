import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { colors, fontFamily, layout, radius, shadows, spacing } from '@/theme';

interface TextFieldProps extends TextInputProps {
  icon?: IconName;
  invalid?: boolean;
}

export function TextField({ icon, invalid, style, multiline, ...props }: TextFieldProps) {
  return (
    <View style={[styles.wrap, multiline && styles.multiline, invalid && styles.invalid]}>
      {icon && <Icon name={icon} size={20} color={colors.textSecondary} />}
      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, multiline && styles.inputMultiline, style]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.inputHeight,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.transparent,
    ...shadows.sm,
  },
  multiline: { alignItems: 'flex-start', paddingVertical: spacing.md },
  invalid: { borderColor: colors.danger },
  input: {
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: 16,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top', paddingVertical: 0 },
});
