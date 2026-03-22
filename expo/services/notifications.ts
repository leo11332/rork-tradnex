import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { getEnv } from '@/utils/env';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') {
    console.log('[notifications] web platform, skipping push registration');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log('[notifications] existing permission status:', existingStatus);

    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log('[notifications] requested permission, new status:', status);
    }

    if (finalStatus !== 'granted') {
      console.log('[notifications] permission not granted');
      return null;
    }

    const projectId = getEnv('EXPO_PUBLIC_PROJECT_ID');
    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId: projectId || undefined,
    });
    const token = tokenResponse.data;
    console.log('[notifications] push token obtained:', token);

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('stress-alerts', {
        name: 'Alertes de stress',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0A84FF',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('health-updates', {
        name: 'Mises à jour santé',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
      });

      console.log('[notifications] Android channels created');
    }

    return token;
  } catch (error) {
    console.log('[notifications] registerForPushNotifications error:', error);
    return null;
  }
}

export async function sendLocalStressAlert(stressLevel: number, message: string): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Alerte TRADNEX',
        body: message || `Niveau de stress critique : ${stressLevel}/100`,
        data: { type: 'stress-alert', stressLevel, screen: '/(tabs)/notifications' },
        sound: 'default',
        ...(Platform.OS === 'android' ? { channelId: 'stress-alerts' } : {}),
      },
      trigger: null,
    });
    console.log('[notifications] local stress alert sent:', { stressLevel, message });
  } catch (error) {
    console.log('[notifications] sendLocalStressAlert error:', error);
  }
}

export async function sendLocalHeartRateAlert(heartRate: number): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Fréquence cardiaque élevée',
        body: `Votre BPM est à ${heartRate}. Prenez une pause et respirez profondément.`,
        data: { type: 'heart-rate-alert', heartRate, screen: '/(tabs)' },
        sound: 'default',
        ...(Platform.OS === 'android' ? { channelId: 'stress-alerts' } : {}),
      },
      trigger: null,
    });
    console.log('[notifications] local heart rate alert sent:', { heartRate });
  } catch (error) {
    console.log('[notifications] sendLocalHeartRateAlert error:', error);
  }
}

export async function scheduleDailyReminder(hour: number, minute: number): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'TRADNEX — Bilan du jour',
        body: 'Consultez vos métriques avant votre session de trading.',
        data: { type: 'daily-reminder', screen: '/(tabs)' },
        sound: 'default',
        ...(Platform.OS === 'android' ? { channelId: 'health-updates' } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
    console.log('[notifications] daily reminder scheduled at', hour, ':', minute);
  } catch (error) {
    console.log('[notifications] scheduleDailyReminder error:', error);
  }
}

export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void,
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void,
) {
  return Notifications.addNotificationReceivedListener(callback);
}
