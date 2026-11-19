import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { getErrorMessage } from '@/lib/api/errors';
import { colors, spacing, tones, type Tone } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { PrimaryButton } from './PrimaryButton';

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: string;
  actionLabel?: string;
  /** May return a promise (e.g. a refetch): the button spins and is disabled until it settles. */
  onAction?: () => unknown;
  tone?: Tone;
}

/** Long enough to be noticed: a fast response would otherwise look like nothing happened. */
export const MIN_ACTION_FEEDBACK_MS = 600;

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> =>
  typeof (value as PromiseLike<unknown> | undefined)?.then === 'function';

/** Runs the action and keeps a busy flag while its promise (if any) is pending. */
const useBusyAction = (action: (() => unknown) | undefined) => {
  const [busy, setBusy] = useState(false);
  const run = () => {
    if (!action || busy) return;
    const result = action();
    if (!isPromiseLike(result)) return;
    setBusy(true);
    const minimum = new Promise((resolve) => setTimeout(resolve, MIN_ACTION_FEEDBACK_MS));
    const done = () => setBusy(false);
    Promise.all([Promise.resolve(result), minimum]).then(done, done);
  };
  return { busy, run };
};

export function EmptyState({
  icon = 'paw',
  title,
  description,
  actionLabel,
  onAction,
  tone = 'coral',
}: EmptyStateProps) {
  const action = useBusyAction(onAction);
  return (
    <View style={styles.container} testID="empty-state">
      <View style={[styles.iconCircle, { backgroundColor: tones[tone].background }]}>
        <Icon name={icon} size={40} color={tones[tone].foreground} />
      </View>
      <AppText variant="heading" align="center">
        {title}
      </AppText>
      {description ? (
        <AppText color="textSecondary" align="center">
          {description}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <PrimaryButton
          label={actionLabel}
          onPress={action.run}
          loading={action.busy}
          compact
          style={styles.action}
          testID="empty-state-action"
        />
      ) : null}
    </View>
  );
}

export function LoadingState({ label }: { label?: string }) {
  return (
    <View style={styles.container} testID="loading-state">
      <ActivityIndicator size="large" color={colors.coral} />
      {label ? <AppText color="textSecondary">{label}</AppText> : null}
    </View>
  );
}

/** `onRetry` may return the refetch promise so the button shows progress. */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => unknown }) {
  return (
    <EmptyState
      icon="emoticon-sad-outline"
      tone="neutral"
      title="Ops! Algo deu errado"
      description={getErrorMessage(error)}
      actionLabel={onRetry ? 'Tentar novamente' : undefined}
      onAction={onRetry}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xxxl,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  action: { marginTop: spacing.md },
});
