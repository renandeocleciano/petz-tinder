import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { DiscoverActions, type DiscoverAction } from '@/components/pet/DiscoverActions';
import { MatchCelebration } from '@/components/pet/MatchCelebration';
import { PetCard } from '@/components/pet/PetCard';
import {
  SwipeableCard,
  type SwipeableCardHandle,
  type SwipeDirection,
} from '@/components/pet/SwipeableCard';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useDiscoverActions } from '@/features/discover/useDiscoverActions';
import { useDiscoverQueue } from '@/hooks/useDiscover';
import { useActivePet } from '@/hooks/useMe';
import { useAppStore } from '@/store/appStore';
import { layout, spacing } from '@/theme';
import type { LikeType, Pet } from '@/types/domain';

const DIRECTION_TO_LIKE: Record<SwipeDirection, LikeType> = {
  left: 'dislike',
  right: 'like',
  up: 'super_like',
};

const isCompatible = (pet: Pet, mine: Pet | null) =>
  Boolean(mine?.personalityTraits.some((trait) => pet.personalityTraits.includes(trait)));

export default function DiscoverScreen() {
  const router = useRouter();
  const cardRef = useRef<SwipeableCardHandle>(null);
  const { activePet } = useActivePet();
  const queue = useDiscoverQueue();
  const actions = useDiscoverActions(activePet);
  const hasFilters = useAppStore((s) => Object.keys(s.discoverFilters).length > 0);
  const resetFilters = useAppStore((s) => s.setDiscoverFilters);

  const current = queue.data?.[0];

  const onSwiped = (direction: SwipeDirection) => {
    if (current) void actions.send(current, DIRECTION_TO_LIKE[direction]);
  };

  const onAction = (action: DiscoverAction) => {
    if (!current) return;
    if (action === 'message') return actions.directMessage(current);
    cardRef.current?.swipe(action === 'dislike' ? 'left' : action === 'like' ? 'right' : 'up');
  };

  const renderBody = () => {
    if (queue.isLoading) return <LoadingState label="Procurando pets por perto..." />;
    if (queue.isError) return <ErrorState error={queue.error} onRetry={() => queue.refetch()} />;
    if (!current) {
      return (
        <EmptyState
          icon="map-search-outline"
          title="Você viu todos os pets por aqui!"
          description="Volte mais tarde ou explore outra cidade para encontrar novos amigos."
          actionLabel={hasFilters ? 'Limpar filtros' : 'Atualizar'}
          onAction={() => (hasFilters ? resetFilters({}) : queue.refetch())}
        />
      );
    }
    return (
      <SwipeableCard key={current.id} ref={cardRef} onSwiped={onSwiped}>
        <PetCard
          pet={current}
          compatible={isCompatible(current, activePet)}
          onOpenProfile={() => router.push({ pathname: '/pet/[id]', params: { id: current.id } })}
        />
      </SwipeableCard>
    );
  };

  return (
    <Screen>
      <ScreenHeader />
      <View style={styles.deck}>{renderBody()}</View>
      <View style={[styles.actions, { paddingBottom: layout.tabBarHeight + spacing.md }]}>
        <DiscoverActions onAction={onAction} disabled={!current} />
      </View>
      <MatchCelebration
        myPet={activePet}
        matchedPet={actions.matchedPet}
        onMessage={actions.openMatchConversation}
        onClose={actions.closeMatch}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  deck: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  actions: { paddingTop: spacing.lg },
});
