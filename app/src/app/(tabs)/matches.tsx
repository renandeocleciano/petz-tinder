import { useRouter } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { MatchCard } from '@/components/match/MatchCard';
import { NewMatchesRow } from '@/components/match/NewMatchesRow';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useMatches } from '@/hooks/useMatches';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import type { MatchSummary } from '@/lib/api';
import { colors, layout, spacing } from '@/theme';

export default function MatchesScreen() {
  const router = useRouter();
  const matches = useMatches();
  const pull = usePullToRefresh(matches.refetch);

  const open = (match: MatchSummary) =>
    router.push({ pathname: '/conversation/[id]', params: { id: match.conversationId } });

  if (matches.isLoading) {
    return (
      <Screen>
        <ScreenHeader />
        <LoadingState />
      </Screen>
    );
  }
  if (matches.isError) {
    return (
      <Screen>
        <ScreenHeader />
        <ErrorState error={matches.error} onRetry={() => matches.refetch()} />
      </Screen>
    );
  }

  const all = matches.data ?? [];
  const fresh = all.filter((m) => m.isNew);

  return (
    <Screen>
      <ScreenHeader />
      <FlatList
        data={all}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={pull.refreshing}
            onRefresh={pull.onRefresh}
            tintColor={colors.coral}
          />
        }
        ListHeaderComponent={
          fresh.length > 0 ? (
            <View style={styles.newSection}>
              <AppText variant="heading" style={styles.sectionTitle}>
                Novos matches
              </AppText>
              <NewMatchesRow matches={fresh} onPress={open} />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.item}>
            <MatchCard match={item} onPress={() => open(item)} />
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="heart-outline"
            title="Nenhum match ainda"
            description="Curta pets no Descobrir. Quando o interesse for mútuo, o match aparece aqui!"
            actionLabel="Descobrir pets"
            onAction={() => router.navigate('/discover')}
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: layout.tabBarHeight + spacing.xl, flexGrow: 1 },
  newSection: { gap: spacing.md, marginBottom: spacing.xl, marginTop: spacing.sm },
  sectionTitle: { paddingHorizontal: spacing.xl },
  item: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
});
