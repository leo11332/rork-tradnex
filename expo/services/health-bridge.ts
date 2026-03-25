import { Platform } from 'react-native';

export interface HealthSample {
  heartRate: number;
  hrv: number;
  sleepHours: number;
  sleepScore: number;
  stress: number;
  timestamp: string;
}

export interface HealthBridgeStatus {
  available: boolean;
  authorized: boolean;
  platform: 'healthkit' | 'health-connect' | 'none';
  message: string;
}

const IS_NATIVE = Platform.OS === 'ios' || Platform.OS === 'android';

export function getHealthPlatform(): 'healthkit' | 'health-connect' | 'none' {
  if (Platform.OS === 'ios') return 'healthkit';
  if (Platform.OS === 'android') return 'health-connect';
  return 'none';
}

let nativeHealthModule: {
  isAvailable: () => Promise<boolean>;
  requestPermissions: () => Promise<boolean>;
  getLatestSample: () => Promise<HealthSample | null>;
  getHistory: (days: number) => Promise<HealthSample[]>;
} | null = null;

async function loadNativeModule(): Promise<boolean> {
  if (!IS_NATIVE) return false;
  if (nativeHealthModule) return true;

  try {
    if (Platform.OS === 'ios') {
      const mod = await import('expo-apple-healthkit' as string).catch(() => null);
      if (mod?.default) {
        nativeHealthModule = mod.default;
        console.log('[health-bridge] Native HealthKit module loaded');
        return true;
      }
    }
    if (Platform.OS === 'android') {
      const mod = await import('expo-health-connect' as string).catch(() => null);
      if (mod?.default) {
        nativeHealthModule = mod.default;
        console.log('[health-bridge] Native Health Connect module loaded');
        return true;
      }
    }
  } catch {
    console.log('[health-bridge] Native module not available (expected in Expo Go)');
  }

  return false;
}

export async function checkHealthAvailability(): Promise<HealthBridgeStatus> {
  const platform = getHealthPlatform();

  if (platform === 'none') {
    console.log('[health-bridge] web platform, health not available');
    return {
      available: false,
      authorized: false,
      platform: 'none',
      message: 'Les données de santé ne sont disponibles que sur mobile.',
    };
  }

  const hasNative = await loadNativeModule();

  if (hasNative && nativeHealthModule) {
    try {
      const avail = await nativeHealthModule.isAvailable();
      console.log('[health-bridge] Native module available:', avail);
      return {
        available: avail,
        authorized: false,
        platform,
        message: avail ? 'Prêt à se connecter.' : 'Service de santé non disponible sur cet appareil.',
      };
    } catch (e) {
      console.log('[health-bridge] Native isAvailable error:', e);
    }
  }

  const platformLabel = platform === 'healthkit' ? 'Apple Santé' : 'Health Connect';
  console.log('[health-bridge]', platformLabel, 'ready — mock data used until native build');
  return {
    available: IS_NATIVE,
    authorized: false,
    platform,
    message: `${platformLabel} sera connecté dans le build de production. Données de démonstration actives.`,
  };
}

export async function requestHealthPermissions(): Promise<boolean> {
  const platform = getHealthPlatform();
  console.log('[health-bridge] requestHealthPermissions called for:', platform);

  if (nativeHealthModule) {
    try {
      const granted = await nativeHealthModule.requestPermissions();
      console.log('[health-bridge] Native permissions result:', granted);
      return granted;
    } catch (e) {
      console.log('[health-bridge] Native requestPermissions error:', e);
    }
  }

  console.log('[health-bridge] Using simulated permission grant (native module not available)');
  return platform !== 'none';
}

export async function fetchLatestHealthData(): Promise<HealthSample | null> {
  const platform = getHealthPlatform();
  console.log('[health-bridge] fetchLatestHealthData for:', platform);

  if (nativeHealthModule) {
    try {
      const sample = await nativeHealthModule.getLatestSample();
      if (sample) {
        console.log('[health-bridge] Got real health data:', { hr: sample.heartRate, hrv: sample.hrv });
        return sample;
      }
    } catch (e) {
      console.log('[health-bridge] Native getLatestSample error:', e);
    }
  }

  console.log('[health-bridge] No native data — app will use generated data');
  return null;
}

export async function fetchHealthHistory(days: number): Promise<HealthSample[]> {
  const platform = getHealthPlatform();
  console.log('[health-bridge] fetchHealthHistory for:', platform, 'days:', days);

  if (nativeHealthModule) {
    try {
      const samples = await nativeHealthModule.getHistory(days);
      if (samples.length > 0) {
        console.log('[health-bridge] Got real history:', samples.length, 'samples');
        return samples;
      }
    } catch (e) {
      console.log('[health-bridge] Native getHistory error:', e);
    }
  }

  console.log('[health-bridge] No native history — app will use generated data');
  return [];
}

export const HEALTH_PERMISSIONS_INFO = {
  ios: {
    requiredPermissions: [
      'HKQuantityTypeIdentifierHeartRate',
      'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
      'HKQuantityTypeIdentifierRestingHeartRate',
      'HKCategoryTypeIdentifierSleepAnalysis',
    ],
    usageDescription: 'TRADNEX utilise vos données de santé pour calculer votre score de stress et vous fournir des recommandations de trading personnalisées.',
    infoPlistKeys: {
      NSHealthShareUsageDescription: 'TRADNEX a besoin d\'accéder à vos données de sommeil, fréquence cardiaque et HRV pour analyser votre état physiologique avant le trading.',
      NSHealthUpdateUsageDescription: 'TRADNEX enregistre vos scores de performance pour votre historique personnel.',
    },
  },
  android: {
    requiredPermissions: [
      'android.permission.health.READ_HEART_RATE',
      'android.permission.health.READ_HEART_RATE_VARIABILITY',
      'android.permission.health.READ_SLEEP',
      'android.permission.health.READ_RESTING_HEART_RATE',
    ],
    healthConnectPermissions: [
      'HeartRateRecord',
      'HeartRateVariabilityRmssdRecord',
      'SleepSessionRecord',
      'RestingHeartRateRecord',
    ],
  },
} as const;
