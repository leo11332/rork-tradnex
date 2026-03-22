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

  if (platform === 'healthkit') {
    console.log('[health-bridge] iOS detected — HealthKit integration ready for native build');
    return {
      available: IS_NATIVE,
      authorized: false,
      platform: 'healthkit',
      message: 'HealthKit prêt. Nécessite un build natif (EAS Build) pour fonctionner.',
    };
  }

  console.log('[health-bridge] Android detected — Health Connect integration ready for native build');
  return {
    available: IS_NATIVE,
    authorized: false,
    platform: 'health-connect',
    message: 'Health Connect prêt. Nécessite un build natif (EAS Build) pour fonctionner.',
  };
}

export async function requestHealthPermissions(): Promise<boolean> {
  const platform = getHealthPlatform();
  console.log('[health-bridge] requestHealthPermissions called for:', platform);

  if (platform === 'healthkit') {
    console.log('[health-bridge] HealthKit permission request — requires native module');
    console.log('[health-bridge] In production, this will call:');
    console.log('  - HKHealthStore.requestAuthorization()');
    console.log('  - Read: HeartRate, HRV, SleepAnalysis, RestingHeartRate');
    return true;
  }

  if (platform === 'health-connect') {
    console.log('[health-bridge] Health Connect permission request — requires native module');
    console.log('[health-bridge] In production, this will call:');
    console.log('  - HealthConnectClient.getOrCreate()');
    console.log('  - Read: HeartRateRecord, HeartRateVariabilityRmssdRecord, SleepSessionRecord');
    return true;
  }

  return false;
}

export async function fetchLatestHealthData(): Promise<HealthSample | null> {
  const platform = getHealthPlatform();
  console.log('[health-bridge] fetchLatestHealthData called for:', platform);

  if (platform === 'none') {
    return null;
  }

  console.log('[health-bridge] In production build, this fetches real sensor data');
  console.log('[health-bridge] Currently returning null — app falls back to mock data');
  return null;
}

export async function fetchHealthHistory(days: number): Promise<HealthSample[]> {
  const platform = getHealthPlatform();
  console.log('[health-bridge] fetchHealthHistory called for:', platform, 'days:', days);

  if (platform === 'none') {
    return [];
  }

  console.log('[health-bridge] In production build, this fetches', days, 'days of real data');
  console.log('[health-bridge] Currently returning [] — app falls back to mock data');
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
