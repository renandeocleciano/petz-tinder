import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { colors, layout, radius, shadows, spacing } from '@/theme';

export interface SelectOption<T extends string | number> {
  value: T;
  label: string;
  icon?: IconName;
}

interface SelectFieldProps<T extends string | number> {
  value: T | undefined;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  icon?: IconName;
  title: string;
  invalid?: boolean;
  testID?: string;
}

export function SelectField<T extends string | number>({
  value,
  options,
  onChange,
  placeholder = 'Selecionar',
  icon,
  title,
  invalid,
  testID,
}: SelectFieldProps<T>) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  const leadingIcon = selected?.icon ?? icon;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}: ${selected?.label ?? placeholder}`}
        testID={testID}
        onPress={() => setOpen(true)}
        style={[styles.field, invalid && styles.invalid]}
      >
        {leadingIcon && <Icon name={leadingIcon} size={20} color={colors.textSecondary} />}
        <AppText
          variant="bodyStrong"
          color={selected ? 'text' : 'textSecondary'}
          numberOfLines={1}
          style={styles.label}
        >
          {selected?.label ?? placeholder}
        </AppText>
        <Icon name="chevron-down" size={20} color={colors.textSecondary} />
      </Pressable>

      <Sheet visible={open} onClose={() => setOpen(false)} title={title}>
        <FlatList
          data={options}
          keyExtractor={(option) => String(option.value)}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => {
            const isSelected = item.value === value;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => {
                  onChange(item.value);
                  setOpen(false);
                }}
                style={styles.option}
              >
                {item.icon && <Icon name={item.icon} size={20} color={colors.textSecondary} />}
                <AppText variant={isSelected ? 'bodyStrong' : 'body'} style={styles.label}>
                  {item.label}
                </AppText>
                {isSelected && <Icon name="check" size={20} color={colors.coral} />}
              </Pressable>
            );
          }}
        />
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: layout.inputHeight,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.transparent,
    ...shadows.sm,
  },
  invalid: { borderColor: colors.danger },
  label: { flex: 1 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md + 2,
  },
  separator: { height: 1, backgroundColor: colors.border },
});
