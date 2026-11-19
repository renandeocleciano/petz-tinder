import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { colors } from '@/theme';

type NotificationsModule = typeof import('expo-notifications');

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let notifications: NotificationsModule | null = null;

/** Loaded lazily: Expo Go (Android) no longer ships remote push and errors on import. */
const getNotifications = (): NotificationsModule | null => {
  if (isExpoGo) return null;
  if (!notifications) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    notifications = require('expo-notifications') as NotificationsModule;
    notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: true,
      }),
    });
  }
  return notifications;
};

/**
 * Requests permission and returns the Expo push token, or null when unavailable
 * (Expo Go, simulator, denied permission, missing EAS projectId). The token is sent
 * to the backend via PATCH /me.
 */
export const registerForPushNotifications = async (): Promise<string | null> => {
  const Notifications = getNotifications();
  if (!Notifications || !Device.isDevice) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Petz',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: colors.coral,
    });
  }

  const current = await Notifications.getPermissionsAsync();
  const status = current.granted
    ? current.status
    : (await Notifications.requestPermissionsAsync()).status;
  if (status !== Notifications.PermissionStatus.GRANTED) return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;
  if (!projectId) return null;

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch {
    return null;
  }
};
