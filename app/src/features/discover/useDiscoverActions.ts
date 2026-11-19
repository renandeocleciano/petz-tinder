import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { useLike } from '@/hooks/useDiscover';
import { usePremiumGate } from '@/hooks/usePremium';
import { getErrorMessage, isPremiumRequired } from '@/lib/api';
import type { LikeType, Pet } from '@/types/domain';

/** Orchestrates like/dislike/super like/direct message plus the match celebration. */
export const useDiscoverActions = (myPet: Pet | null) => {
  const router = useRouter();
  const like = useLike();
  const { requirePremium } = usePremiumGate();
  const [matchedPet, setMatchedPet] = useState<Pet | null>(null);
  const [matchConversationId, setMatchConversationId] = useState<string | null>(null);

  const send = async (pet: Pet, type: LikeType) => {
    if (!myPet) return;
    try {
      const result = await like.mutateAsync({ fromPetId: myPet.id, toPetId: pet.id, type });
      if (type === 'direct_message' && result.conversationId) {
        router.push({ pathname: '/conversation/[id]', params: { id: result.conversationId } });
      } else if (result.match) {
        setMatchedPet(result.match.pet);
        setMatchConversationId(result.match.conversationId);
      }
    } catch (error) {
      if (isPremiumRequired(error)) router.push('/premium');
      else Alert.alert('Ops!', getErrorMessage(error));
    }
  };

  const directMessage = (pet: Pet) => {
    if (requirePremium('direct_message')) void send(pet, 'direct_message');
  };

  const closeMatch = () => {
    setMatchedPet(null);
    setMatchConversationId(null);
  };

  const openMatchConversation = () => {
    const id = matchConversationId;
    closeMatch();
    if (id) router.push({ pathname: '/conversation/[id]', params: { id } });
  };

  return {
    send,
    directMessage,
    matchedPet,
    closeMatch,
    openMatchConversation,
    isSending: like.isPending,
  };
};
