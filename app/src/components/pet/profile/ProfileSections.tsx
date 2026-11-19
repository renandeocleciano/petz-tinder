import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { INTEREST_BY_VALUE } from '@/constants/pet';
import { colors, radius, spacing, tones } from '@/theme';
import type { Availability, Interest } from '@/types/domain';

function Section({
  icon,
  iconColor = colors.tealDark,
  title,
  children,
  style,
}: {
  icon: IconName;
  iconColor?: string;
  title: string;
  children: ReactNode;
  style?: object;
}) {
  return (
    <Card style={[styles.section, style]}>
      <View style={styles.sectionTitle}>
        <Icon name={icon} size={22} color={iconColor} />
        <AppText variant="subheading">{title}</AppText>
      </View>
      {children}
    </Card>
  );
}

export function AboutSection({ bio }: { bio: string }) {
  return (
    <Section icon="file-document-outline" title="Sobre mim">
      <AppText>{bio || 'Este pet ainda não escreveu uma bio.'}</AppText>
    </Section>
  );
}

export function InterestsSection({ interests }: { interests: Interest[] }) {
  if (!interests.length) return null;
  return (
    <Section icon="heart" iconColor={colors.coral} title="Meus interesses">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.interests}
      >
        {interests.map((interest) => {
          const option = INTEREST_BY_VALUE[interest];
          const palette = tones[option.tone];
          return (
            <View key={interest} style={styles.interest}>
              <View style={[styles.interestIcon, { backgroundColor: palette.background }]}>
                <Icon name={option.icon} size={26} color={palette.foreground} />
              </View>
              <AppText variant="caption">{option.label}</AppText>
            </View>
          );
        })}
      </ScrollView>
    </Section>
  );
}

export function GallerySection({ photos }: { photos: string[] }) {
  if (photos.length < 2) return null;
  return (
    <Section icon="image-multiple" iconColor={colors.coral} title="Galeria de fotos">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.gallery}
      >
        {photos.map((uri) => (
          <Image key={uri} source={{ uri }} style={styles.photo} contentFit="cover" />
        ))}
      </ScrollView>
    </Section>
  );
}

export function AvailabilitySection({ availability }: { availability: Availability | null }) {
  return (
    <Section icon="calendar-month-outline" title="Disponibilidade" style={styles.half}>
      <View style={styles.availability}>
        <Icon name="calendar-check" size={22} color={colors.tealDark} />
        <View style={styles.flex}>
          <AppText variant="bodyStrong" color="tealDark">
            {availability?.title ?? 'A combinar'}
          </AppText>
          {availability?.detail ? (
            <AppText variant="caption" color="tealDark">
              {availability.detail}
            </AppText>
          ) : null}
        </View>
      </View>
    </Section>
  );
}

export function PreferencesSection({ preferences }: { preferences: string[] }) {
  return (
    <Section icon="tune-variant" title="Preferências" style={styles.half}>
      {preferences.length ? (
        preferences.map((preference) => (
          <View key={preference} style={styles.preference}>
            <Icon name="paw" size={16} color={colors.teal} />
            <AppText variant="caption" style={styles.flex}>
              {preference}
            </AppText>
          </View>
        ))
      ) : (
        <AppText variant="caption" color="textSecondary">
          Aberto a novos amigos
        </AppText>
      )}
    </Section>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  half: { flex: 1 },
  flex: { flex: 1 },
  interests: { gap: spacing.lg },
  interest: { alignItems: 'center', gap: spacing.xs },
  interestIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gallery: { gap: spacing.sm },
  photo: { width: 112, height: 112, borderRadius: radius.lg },
  availability: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.mint,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  preference: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
