import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { spacing } from '@/theme';

interface FormFieldProps {
  label: string;
  error?: string;
  children: ReactNode;
  style?: ViewStyle;
}

export function FormField({ label, error, children, style }: FormFieldProps) {
  return (
    <View style={[styles.field, style]}>
      <AppText variant="caption">{label}</AppText>
      {children}
      {error ? (
        <AppText variant="caption" color="danger" accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs + 2 },
});
