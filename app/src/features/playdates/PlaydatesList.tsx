import { useRouter } from 'expo-router';
import { RefreshControl, SectionList, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { usePlaydates } from '@/hooks/useConversations';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { colors, layout, spacing } from '@/theme';

import { groupPlaydates } from './groupPlaydates';
import { PlaydateRow } from './PlaydateRow';

/** Chat tab → Passeios: upcoming, pending and recent playdates across conversations. */
export function PlaydatesList() {
  const router = useRouter();
  const playdates = usePlaydates();
  const pull = usePullToRefresh(playdates.refetch);

  if (playdates.isLoading) return <LoadingState />;
  if (playdates.isError) {
    return <ErrorState error={playdates.error} onRetry={() => playdates.refetch()} />;
  }

  const groups = groupPlaydates(playdates.data ?? []);
  const sections = [
    { title: 'Próximos', data: groups.upcoming },
    { title: 'Pendentes', data: groups.pending },
    { title: 'Anteriores', data: groups.past },
  ].filter((section) => section.data.length > 0);

  return (
    <SectionList
      sections={sections}
      keyExtractor={(p) => p.id}
      contentContainerStyle={styles.list}
      stickySectionHeadersEnabled={false}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      refreshControl={
        <RefreshControl
          refreshing={pull.refreshing}
          onRefresh={pull.onRefresh}
          tintColor={colors.coral}
        />
      }
      renderSectionHeader={({ section }) => (
        <AppText variant="caption" color="textSecondary" style={styles.header}>
          {section.title.toUpperCase()}
        </AppText>
      )}
      renderItem={({ item }) => (
        <PlaydateRow
          playdate={item}
          onPress={() =>
            router.push({ pathname: '/conversation/[id]', params: { id: item.conversationId } })
          }
        />
      )}
      ListEmptyComponent={
        <EmptyState
          icon="calendar-heart"
          tone="teal"
          title="Nenhum passeio ainda"
          description="Convide um match para passear: o convite aparece aqui com data e lugar."
          actionLabel="Ver matches"
          onAction={() => router.navigate('/matches')}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: layout.tabBarHeight + spacing.xl,
    flexGrow: 1,
  },
  header: { marginTop: spacing.md, marginBottom: spacing.sm },
  separator: { height: spacing.sm },
});
