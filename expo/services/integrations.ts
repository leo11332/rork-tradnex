import { Platform } from 'react-native';

import { getEnv } from '@/utils/env';

export const supabaseConfig = {
  url: getEnv('EXPO_PUBLIC_SUPABASE_URL'),
  anonKey: getEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
} as const;

export const revenueCatConfig = {
  entitlementId: 'RORK APPLI Pro',
  monthlyProductId: 'tradnex_monthly',
  yearlyProductId: 'tradnex_yearly',
  trialDays: 5,
} as const;

export const healthPlatformLabel = Platform.select({
  ios: 'Apple HealthKit',
  android: 'Health Connect',
  default: 'Health Data Bridge',
}) ?? 'Health Data Bridge';

export async function bootstrapSupabaseProfile(userId: string) {
  console.log('[tradnex] bootstrapSupabaseProfile:start', { userId, hasUrl: Boolean(supabaseConfig.url) });

  return {
    userId,
    tables: ['users', 'health_data', 'user_settings'],
    storageWindowDays: 30,
    anonymousReady: true,
  };
}

export async function syncHealthPayload(userId: string, payloadSize: number) {
  console.log('[tradnex] syncHealthPayload:start', { userId, payloadSize, hasUrl: Boolean(supabaseConfig.url) });

  return {
    syncedAt: new Date().toISOString(),
    payloadSize,
    destination: 'supabase',
  };
}



export async function registerNotificationIntent(stressThreshold: number, heartRateThreshold: number) {
  console.log('[tradnex] registerNotificationIntent:start', { stressThreshold, heartRateThreshold });

  return {
    enabled: true,
    stressThreshold,
    heartRateThreshold,
  };
}
