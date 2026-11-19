import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme';
import type { Pet } from '@/types/domain';

import { PetStats } from '../PetStats';
import {
  AboutSection,
  AvailabilitySection,
  GallerySection,
  InterestsSection,
  PreferencesSection,
} from './ProfileSections';

/** Sections shared by "my profile" and other pets' profiles. Stats only exist for own pets. */
export function PetProfileBody({ pet }: { pet: Pet }) {
  return (
    <View style={styles.body}>
      {pet.stats && <PetStats stats={pet.stats} />}
      <AboutSection bio={pet.bio} />
      <InterestsSection interests={pet.interests} />
      <GallerySection photos={pet.photos} />
      <View style={styles.row}>
        <AvailabilitySection availability={pet.availability} />
        <PreferencesSection preferences={pet.preferences} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.lg, gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
});
