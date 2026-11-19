import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChatComposer } from '@/components/chat/ChatComposer';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { PlaydateComposer } from '@/components/chat/PlaydateComposer';
import { PlaydateInviteCard } from '@/components/chat/PlaydateInviteCard';
import { PetAvatar } from '@/components/pet/PetAvatar';
import { VerifiedBadge } from '@/components/pet/VerifiedBadge';
import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { pickChatImage } from '@/features/chat/pickChatImage';
import { SafetySheet } from '@/features/safety/SafetySheet';
import {
  useConversation,
  useMessages,
  useRespondPlaydate,
  useSendMessage,
} from '@/hooks/useConversations';
import { useKeyboardVisible } from '@/hooks/useKeyboardVisible';
import { useMe } from '@/hooks/useMe';
import { getErrorMessage, type SendMessageInput } from '@/lib/api';
import { colors, spacing } from '@/theme';
import type { Message } from '@/types/domain';

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const me = useMe();
  const conversation = useConversation(id);
  const messages = useMessages(id);
  const send = useSendMessage(id);
  const respond = useRespondPlaydate(id);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);

  const myUserId = me.data?.user.id;
  const ordered = useMemo(() => [...(messages.data ?? [])].reverse(), [messages.data]);

  const sendMessage = async (input: SendMessageInput) => {
    try {
      await send.mutateAsync(input);
      return true;
    } catch (error) {
      Alert.alert('Mensagem não enviada', getErrorMessage(error));
      return false;
    }
  };

  const sendImage = async () => {
    const uri = await pickChatImage();
    if (uri) await sendMessage({ type: 'image', imageUrl: uri });
  };

  const sendInvite = async (playdate: NonNullable<SendMessageInput['playdate']>) => {
    if (
      await sendMessage({
        type: 'playdate_invite',
        text: 'Vamos fazer um passeio juntos?',
        playdate,
      })
    ) {
      setInviteOpen(false);
    }
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isMine = item.senderUserId === myUserId;
    if (item.type === 'playdate_invite' && item.playdate) {
      return (
        <PlaydateInviteCard
          invite={item.playdate}
          isMine={isMine}
          responding={respond.isPending}
          onAccept={() => respond.mutate({ messageId: item.id, status: 'accepted' })}
          onSuggestOther={() => {
            respond.mutate({ messageId: item.id, status: 'declined' });
            setInviteOpen(true);
          }}
        />
      );
    }
    const avatar = isMine ? conversation.data?.myPet.photos[0] : conversation.data?.pet.photos[0];
    return <MessageBubble message={item} isMine={isMine} avatarUri={avatar} />;
  };

  if (conversation.isError) {
    return (
      <Screen>
        <ErrorState error={conversation.error} onRetry={() => conversation.refetch()} />
      </Screen>
    );
  }

  const pet = conversation.data?.pet;

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton
          icon="chevron-left"
          accessibilityLabel="Voltar"
          onPress={() => router.back()}
          elevated={false}
          background="transparent"
        />
        <Pressable
          style={styles.headerInfo}
          accessibilityRole="button"
          accessibilityLabel={pet ? `Ver perfil de ${pet.name}` : 'Perfil'}
          onPress={() => pet && router.push({ pathname: '/pet/[id]', params: { id: pet.id } })}
        >
          <PetAvatar uri={pet?.photos[0]} size={52} />
          <View style={styles.flex}>
            <View style={styles.nameRow}>
              <AppText variant="heading" numberOfLines={1}>
                {pet?.name ?? ''}
              </AppText>
              {pet?.verified && <VerifiedBadge size={20} />}
            </View>
            <View style={styles.nameRow}>
              <Icon name="paw" size={16} color={colors.teal} />
              <AppText variant="caption" color="teal">
                {conversation.data?.matchId ? 'Match confirmado' : 'Mensagem direta'}
              </AppText>
            </View>
          </View>
        </Pressable>
        <IconButton
          icon="dots-vertical"
          accessibilityLabel="Mais opções"
          onPress={() => setSafetyOpen(true)}
        />
      </View>

      {/* No vertical offset: the view's measured position already includes the top inset
          applied by <Screen>; adding it again leaves a gap above the keyboard. */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {messages.isLoading ? (
          <LoadingState />
        ) : (
          <FlatList
            inverted
            data={ordered}
            keyExtractor={(m) => m.id}
            renderItem={renderItem}
            contentContainerStyle={styles.messages}
            keyboardShouldPersistTaps="handled"
            ListFooterComponent={
              <AppText variant="caption" color="textSecondary" align="center" style={styles.safety}>
                Por segurança, combine passeios em locais públicos e não compartilhe endereço.
              </AppText>
            }
          />
        )}
        {/* The home indicator inset only matters while the keyboard is closed. */}
        <View style={{ paddingBottom: (keyboardVisible ? 0 : insets.bottom) + spacing.sm }}>
          <ChatComposer
            onSendText={(text) => void sendMessage({ type: 'text', text })}
            onPickImage={() => void sendImage()}
            onInvite={() => setInviteOpen(true)}
            sending={send.isPending}
          />
        </View>
      </KeyboardAvoidingView>

      <PlaydateComposer
        visible={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSubmit={(invite) => void sendInvite(invite)}
        submitting={send.isPending}
      />
      {pet && (
        <SafetySheet
          petId={pet.id}
          petName={pet.name}
          visible={safetyOpen}
          onClose={() => setSafetyOpen(false)}
          onBlocked={() => router.back()}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  messages: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  safety: { marginVertical: spacing.lg, paddingHorizontal: spacing.xl },
});
