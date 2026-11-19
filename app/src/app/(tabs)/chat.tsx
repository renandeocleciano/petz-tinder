import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { ConversationRow } from '@/components/chat/ConversationRow';
import { AppText } from '@/components/ui/AppText';
import { Chip } from '@/components/ui/Chip';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { PlaydatesList } from '@/features/playdates/PlaydatesList';
import { useConversations } from '@/hooks/useConversations';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { colors, layout, spacing } from '@/theme';

type Segment = 'conversations' | 'playdates';

export default function ChatListScreen() {
  const router = useRouter();
  const [segment, setSegment] = useState<Segment>('conversations');
  const conversations = useConversations();
  const pull = usePullToRefresh(conversations.refetch);

  const body = () => {
    if (conversations.isLoading) return <LoadingState />;
    if (conversations.isError) {
      return <ErrorState error={conversations.error} onRetry={() => conversations.refetch()} />;
    }
    return (
      <FlatList
        data={conversations.data}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={pull.refreshing}
            onRefresh={pull.onRefresh}
            tintColor={colors.coral}
          />
        }
        renderItem={({ item }) => (
          <ConversationRow
            conversation={item}
            onPress={() => router.push({ pathname: '/conversation/[id]', params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="chat-outline"
            tone="teal"
            title="Nenhuma conversa ainda"
            description="Mande um oi para seus matches e combine o primeiro passeio."
            actionLabel="Ver matches"
            onAction={() => router.navigate('/matches')}
          />
        }
      />
    );
  };

  return (
    <Screen>
      <ScreenHeader showFilters={false} />
      <AppText variant="title" style={styles.title}>
        Conversas
      </AppText>
      <View style={styles.segments} accessibilityRole="tablist">
        <Chip
          label="Conversas"
          icon="chat-outline"
          selected={segment === 'conversations'}
          onPress={() => setSegment('conversations')}
          testID="segment-conversations"
        />
        <Chip
          label="Passeios"
          icon="calendar-heart"
          selected={segment === 'playdates'}
          onPress={() => setSegment('playdates')}
          testID="segment-playdates"
        />
      </View>
      {segment === 'conversations' ? body() : <PlaydatesList />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { paddingHorizontal: spacing.xl, marginVertical: spacing.sm },
  segments: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: layout.tabBarHeight + spacing.xl,
    flexGrow: 1,
  },
  separator: { height: spacing.sm },
});
