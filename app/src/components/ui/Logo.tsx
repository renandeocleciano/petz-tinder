import { StyleSheet, View } from 'react-native';

import { colors, fontFamily } from '@/theme';

import { AppText } from './AppText';
import { Icon } from './Icon';

/** Temporary wordmark until the final brand assets are ready. */
export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const scale = { sm: 0.8, md: 1, lg: 1.35 }[size];
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel="Petz">
      <Icon name="paw" size={34 * scale} color={colors.coral} />
      <AppText style={[styles.word, { fontSize: 30 * scale, lineHeight: 36 * scale }]}>
        Petz
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  word: { fontFamily: fontFamily.black, color: colors.text, letterSpacing: -0.5 },
});
