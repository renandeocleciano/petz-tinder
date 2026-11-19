import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { IconButton } from '@/components/ui/IconButton';
import { colors, fontFamily, radius, shadows, spacing } from '@/theme';

interface ChatComposerProps {
  onSendText: (text: string) => void;
  onPickImage: () => void;
  onInvite: () => void;
  sending?: boolean;
}

export function ChatComposer({ onSendText, onPickImage, onInvite, sending }: ChatComposerProps) {
  const [text, setText] = useState('');
  const canSend = text.trim().length > 0 && !sending;

  const send = () => {
    if (!canSend) return;
    onSendText(text.trim());
    setText('');
  };

  return (
    <View style={styles.row}>
      <View style={styles.inputWrap}>
        <IconButton
          icon="calendar-heart"
          accessibilityLabel="Convidar para passeio"
          onPress={onInvite}
          elevated={false}
          size={36}
          color={colors.teal}
          background="transparent"
        />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Digite uma mensagem..."
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
          multiline
          maxLength={1000}
          accessibilityLabel="Mensagem"
          testID="chat-input"
        />
        <IconButton
          icon="image-outline"
          accessibilityLabel="Enviar imagem"
          onPress={onPickImage}
          elevated={false}
          size={36}
          background="transparent"
        />
      </View>
      <IconButton
        icon="send"
        accessibilityLabel="Enviar"
        onPress={send}
        size={52}
        color={colors.textInverse}
        background={canSend ? colors.teal : colors.border}
        testID="chat-send"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    minHeight: 52,
    ...shadows.sm,
  },
  input: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 15,
    color: colors.text,
    maxHeight: 110,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
});
