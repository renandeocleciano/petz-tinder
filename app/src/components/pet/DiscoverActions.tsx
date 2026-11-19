import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import type { IconName } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { colors, spacing } from '@/theme';

export type DiscoverAction = 'dislike' | 'message' | 'like' | 'super_like';

const ACTIONS: {
  action: DiscoverAction;
  label: string;
  icon: IconName;
  color: string;
  background: string;
}[] = [
  {
    action: 'dislike',
    label: 'Não curti',
    icon: 'close-thick',
    color: colors.coral,
    background: colors.surface,
  },
  {
    action: 'message',
    label: 'Mensagem',
    icon: 'chat-processing',
    color: colors.teal,
    background: colors.surface,
  },
  {
    action: 'like',
    label: 'Curtir',
    icon: 'heart',
    color: colors.coral,
    background: colors.surface,
  },
  {
    action: 'super_like',
    label: 'Super like',
    icon: 'star',
    color: colors.textInverse,
    background: colors.teal,
  },
];

export function DiscoverActions({
  onAction,
  disabled,
}: {
  onAction: (action: DiscoverAction) => void;
  disabled?: boolean;
}) {
  return (
    <View
      style={[styles.row, disabled && styles.disabled]}
      pointerEvents={disabled ? 'none' : 'auto'}
    >
      {ACTIONS.map((item) => (
        <View key={item.action} style={styles.item}>
          <IconButton
            icon={item.icon}
            size={64}
            iconSize={item.action === 'message' ? 28 : 32}
            color={item.color}
            background={item.background}
            accessibilityLabel={item.label}
            testID={`discover-action-${item.action}`}
            onPress={() => onAction(item.action)}
          />
          <AppText variant="caption">{item.label}</AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: spacing.sm },
  item: { alignItems: 'center', gap: spacing.sm },
  disabled: { opacity: 0.5 },
});
