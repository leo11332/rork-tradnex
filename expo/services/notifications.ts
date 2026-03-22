import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { getEnv } from '@/utils/env';
import { getSessionTimesForDate, TRADING_SESSIONS } from '@/constants/trading-sessions';
import type { TradingSessionId, TimezoneValue } from '@/constants/trading-sessions';
import type { PreSessionAlertConfig } from '@/providers/tradnex-provider';

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
        title: '⚠️ Seuil de stress dépassé',
        body: message || `Votre stress est à ${stressLevel}/100. C'est dans ces moments-là que 90% des tilts surviennent. Prenez du recul avant d'agir.`,
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
        title: '⚠️ Fréquence cardiaque élevée',
        body: `Votre BPM est à ${heartRate}. C'est dans ces moments-là que 90% des tilts surviennent. Respirez, ne prenez aucune décision maintenant.`,
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

export interface PreSessionReport {
  score: number;
  stress: number;
  sleep: string;
  hrv: number;
  recommendation: string;
}

export async function schedulePreSessionNotifications(
  config: PreSessionAlertConfig,
  userTimezone: TimezoneValue,
  report: PreSessionReport,
): Promise<void> {
  if (Platform.OS === 'web') {
    console.log('[notifications] web platform, skipping pre-session scheduling');
    return;
  }

  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      if (notif.content.data?.type === 'pre-session-report') {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }
    console.log('[notifications] cleared existing pre-session notifications');

    const now = new Date();
    const enabledSessions: TradingSessionId[] = [];
    if (config.tokyo.enabled) enabledSessions.push('tokyo');
    if (config.london.enabled) enabledSessions.push('london');
    if (config.newyork.enabled) enabledSessions.push('newyork');

    if (enabledSessions.length === 0) {
      console.log('[notifications] no pre-session alerts enabled');
      return;
    }

    const resolved = getSessionTimesForDate(enabledSessions, now, userTimezone);
    console.log('[notifications] resolved session times for', userTimezone, ':', JSON.stringify(resolved));

    for (const session of resolved) {
      const sessionMeta = TRADING_SESSIONS.find(s => s.id === session.id);
      if (!sessionMeta) continue;

      const minutesBefore = config[session.id].minutesBefore ?? 15;

      const openHour = Math.floor(session.startHour);
      const openMinute = Math.round((session.startHour - openHour) * 60);

      let alertHour = openHour;
      let alertMinute = openMinute - minutesBefore;
      if (alertMinute < 0) {
        alertMinute += 60;
        alertHour -= 1;
        if (alertHour < 0) alertHour += 24;
      }

      const alertDate = new Date(now);
      alertDate.setHours(alertHour, alertMinute, 0, 0);

      if (alertDate.getTime() <= now.getTime()) {
        alertDate.setDate(alertDate.getDate() + 1);
      }

      const secondsUntil = Math.max(1, Math.round((alertDate.getTime() - now.getTime()) / 1000));

      const openTimeStr = `${String(openHour).padStart(2, '0')}h${String(openMinute).padStart(2, '0')}`;

      const body = `Score : ${report.score}/100 · Stress : ${report.stress}/100 · Sommeil : ${report.sleep} · HRV : ${report.hrv} ms\n${report.recommendation}`;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Rapport pré-session — ${sessionMeta.label} (${openTimeStr})`,
          body,
          data: { type: 'pre-session-report', sessionId: session.id, screen: '/(tabs)' },
          sound: 'default',
          ...(Platform.OS === 'android' ? { channelId: 'health-updates' } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: secondsUntil,
          repeats: false,
        },
      });

      console.log(`[notifications] pre-session scheduled: ${sessionMeta.label} at ${alertHour}:${String(alertMinute).padStart(2, '0')} (in ${secondsUntil}s, ${minutesBefore}min before ${openTimeStr})`);
    }
  } catch (error) {
    console.log('[notifications] schedulePreSessionNotifications error:', error);
  }
}
