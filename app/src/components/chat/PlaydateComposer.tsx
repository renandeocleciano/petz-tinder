import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Chip } from '@/components/ui/Chip';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Sheet } from '@/components/ui/Sheet';
import { LoadingState } from '@/components/ui/States';
import { usePlaceSuggestions } from '@/hooks/useConversations';
import type { SendMessageInput } from '@/lib/api';
import { spacing } from '@/theme';

const TIMES = [8, 10, 16, 18];

const nextDays = (count: number) =>
  Array.from({ length: count }, (_, offset) => {
    const date = new Date();
    date.setDate(date.getDate() + offset + 1);
    date.setHours(0, 0, 0, 0);
    const label =
      offset === 0
        ? 'Amanhã'
        : date
            .toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' })
            .replace('.', '')
            .replace(',', '');
    return { key: date.toISOString(), date, label };
  });

interface PlaydateComposerProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (invite: NonNullable<SendMessageInput['playdate']>) => void;
  submitting?: boolean;
}

export function PlaydateComposer({
  visible,
  onClose,
  onSubmit,
  submitting,
}: PlaydateComposerProps) {
  const places = usePlaceSuggestions(visible);
  const days = useMemo(() => nextDays(7), []);
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [dayKey, setDayKey] = useState(days[0]?.key ?? '');
  const [hour, setHour] = useState(10);

  const place = places.data?.find((p) => p.id === placeId) ?? places.data?.[0];
  const day = days.find((d) => d.key === dayKey) ?? days[0];

  const submit = () => {
    if (!place || !day) return;
    const scheduledAt = new Date(day.date);
    scheduledAt.setHours(hour, 0, 0, 0);
    onSubmit({
      placeName: place.name,
      placeImageUrl: place.imageUrl,
      latitude: place.latitude,
      longitude: place.longitude,
      scheduledAt: scheduledAt.toISOString(),
    });
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Convidar para passeio">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppText variant="subheading">Onde?</AppText>
        {places.isLoading ? (
          <LoadingState />
        ) : (
          <View style={styles.wrap}>
            {places.data?.map((p) => (
              <Chip
                key={p.id}
                label={p.name}
                icon="pine-tree"
                selected={p.id === place?.id}
                onPress={() => setPlaceId(p.id)}
              />
            ))}
          </View>
        )}

        <AppText variant="subheading">Quando?</AppText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.wrap}
        >
          {days.map((d) => (
            <Chip
              key={d.key}
              label={d.label}
              tone="coral"
              selected={d.key === day?.key}
              onPress={() => setDayKey(d.key)}
            />
          ))}
        </ScrollView>

        <AppText variant="subheading">Que horas?</AppText>
        <View style={styles.wrap}>
          {TIMES.map((h) => (
            <Chip
              key={h}
              label={`${String(h).padStart(2, '0')}:00`}
              tone="orange"
              selected={h === hour}
              onPress={() => setHour(h)}
            />
          ))}
        </View>

        <PrimaryButton
          label="Enviar convite"
          tone="teal"
          icon="paw"
          onPress={submit}
          loading={submitting}
          disabled={!place}
          style={styles.submit}
        />
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  submit: { marginTop: spacing.md },
});
