import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { colors, radius, shadows, spacing } from '@/theme';

interface PhotoPickerProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  max: number;
  invalid?: boolean;
}

function RemoveButton({ onPress, testID }: { onPress: () => void; testID: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Remover foto"
      hitSlop={8}
      onPress={onPress}
      style={styles.remove}
      testID={testID}
    >
      <Icon name="close" size={14} color={colors.textInverse} />
    </Pressable>
  );
}

/**
 * Main photo (first) + every other photo as a thumbnail. Each photo has a visible remove
 * button; tapping a thumbnail makes it the main photo.
 */
export function PhotoPicker({ photos, onChange, max, invalid }: PhotoPickerProps) {
  const [main, ...rest] = photos;

  const pick = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permissão necessária',
        'Autorize o acesso às fotos para adicionar fotos do seu pet.',
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: max - photos.length,
      quality: 0.8,
    });
    if (result.canceled) return;
    onChange([...photos, ...result.assets.map((asset) => asset.uri)].slice(0, max));
  };

  const makeMain = (uri: string) => onChange([uri, ...photos.filter((p) => p !== uri)]);
  const remove = (uri: string) => onChange(photos.filter((p) => p !== uri));

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={main ? 'Foto principal' : 'Adicionar foto principal'}
        onPress={main ? undefined : pick}
        style={[styles.main, invalid && styles.invalid]}
        testID="photo-picker-main"
      >
        {main ? (
          <Image source={{ uri: main }} style={styles.mainImage} contentFit="cover" />
        ) : (
          <Icon name="paw" size={56} color={colors.coral} />
        )}
        {main && <RemoveButton onPress={() => remove(main)} testID="photo-remove-0" />}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Adicionar fotos"
          onPress={pick}
          style={styles.camera}
        >
          <Icon name="camera" size={22} color={colors.textInverse} />
        </Pressable>
      </Pressable>

      <View style={styles.thumbs}>
        {rest.map((uri, index) => (
          <Pressable
            key={uri}
            onPress={() => makeMain(uri)}
            accessibilityLabel="Foto do pet. Toque para tornar principal"
            testID={`photo-thumb-${index + 1}`}
          >
            <Image source={{ uri }} style={styles.thumb} contentFit="cover" />
            <RemoveButton onPress={() => remove(uri)} testID={`photo-remove-${index + 1}`} />
          </Pressable>
        ))}
        {photos.length < max && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Adicionar mais fotos"
            onPress={pick}
            style={[styles.thumb, styles.add]}
          >
            <Icon name="plus" size={28} color={colors.text} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const MAIN = 132;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  main: {
    width: MAIN,
    height: MAIN,
    borderRadius: MAIN / 2,
    borderWidth: 4,
    borderColor: colors.surface,
    backgroundColor: colors.coralSoft,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  invalid: { borderColor: colors.danger },
  mainImage: { width: MAIN - 8, height: MAIN - 8, borderRadius: (MAIN - 8) / 2 },
  camera: {
    position: 'absolute',
    right: -2,
    bottom: 2,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.teal,
    borderWidth: 3,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Up to 5 thumbnails + "add": wraps into two rows of three.
  thumbs: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  thumb: { width: 56, height: 64, borderRadius: radius.md },
  remove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.text,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  add: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
