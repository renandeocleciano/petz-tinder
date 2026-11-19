import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

/**
 * Picks an image for a chat message. Returns a local URI; once the backend exists this
 * is where the upload (pre-signed URL) happens before sending the message.
 */
export const pickChatImage = async (): Promise<string | null> => {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Permissão necessária', 'Autorize o acesso às fotos para enviar imagens.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
  });
  if (result.canceled) return null;
  return result.assets[0]?.uri ?? null;
};
