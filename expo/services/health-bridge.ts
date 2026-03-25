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

type AppleHealthKitModule = {
  initHealthKit: (permissions: unknown, callback: (err: string | null) => void) => void;
  getHeartRateSamples: (opts: unknown, callback: (err: unknown, results: Array<{ value: number; startDate: string }>) => void) => void;
  getHeartRateVariabilitySamples: (opts: unknown, callback: (err: unknown, results: Array<{ value: number; startDate: string }>) => void) => void;
  getSleepSamples: (opts: unknown, callback: (err: unknown, results: Array<{ value: number; startDate: string; endDate: string }>) => void) => void;
  getRestingHeartRate: (opts: unknown, callback: (err: unknown, results: Array<{ value: number; startDate: string }>) => void) => void;
  Constants: {
    Permissions: Record<string, string>;
  };
};

type HealthConnectModule = {
  initialize: () => Promise<boolean>;
  requestPermission: (perms: Array<{ accessType: string; recordType: string }>) => Promise<unknown>;
  readRecords: (type: string, opts: { timeRangeFilter: { operator: string; startTime: string; endTime: string } }) => Promise<{ records: Array<Record<string, unknown>> }>;
};

let appleHealthKit: AppleHealthKitModule | null = null;
let healthConnect: HealthConnectModule | null = null;
let nativeLoaded = false;

function clampStress(hrv: number): number {
  const raw = Math.round(100 - hrv * 0.8);
  return Math.max(10, Math.min(95, raw));
}

function computeSleepScore(hours: number): number {
  if (hours >= 7.5) return Math.min(95, Math.round(60 + hours * 4.5));
  if (hours >= 6) return Math.round(40 + hours * 5);
  return Math.round(20 + hours * 6);
}

async function tryRequire<T>(moduleName: string): Promise<T | null> {
  try {
    const resolved = require(moduleName) as T;
    return resolved;
  } catch {
    return null;
  }
}

async function loadNativeModules(): Promise<boolean> {
  if (nativeLoaded) return appleHealthKit !== null || healthConnect !== null;
  nativeLoaded = true;

  if (!IS_NATIVE) {
    console.log('[health-bridge] Web platform — no native health module');
    return false;
  }

  if (Platform.OS === 'ios') {
    try {
      const mod = await tryRequire<{ default: AppleHealthKitModule }>('react-native-health');
      if (mod?.default) {
        appleHealthKit = mod.default;
        console.log('[health-bridge] react-native-health loaded successfully');
        return true;
      }
    } catch {
      console.log('[health-bridge] react-native-health not available (expected in Expo Go)');
    }
  }

  if (Platform.OS === 'android') {
    try {
      const mod = await tryRequire<HealthConnectModule>('react-native-health-connect');
      if (mod) {
        healthConnect = mod;
        console.log('[health-bridge] react-native-health-connect loaded successfully');
        return true;
      }
    } catch {
      console.log('[health-bridge] react-native-health-connect not available (expected in Expo Go)');
    }
  }

  console.log('[health-bridge] No native health module found — mock data will be used');
  return false;
}

function initAppleHealthKit(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!appleHealthKit) {
      resolve(false);
      return;
    }

    const permissions = {
      permissions: {
        read: [
          appleHealthKit.Constants.Permissions.HeartRate,
          appleHealthKit.Constants.Permissions.HeartRateVariability,
          appleHealthKit.Constants.Permissions.SleepAnalysis,
          appleHealthKit.Constants.Permissions.RestingHeartRate,
        ],
        write: [],
      },
    };

    appleHealthKit.initHealthKit(permissions, (err) => {
      if (err) {
        console.log('[health-bridge] HealthKit init error:', err);
        resolve(false);
        return;
      }
      console.log('[health-bridge] HealthKit initialized successfully');
      resolve(true);
    });
  });
}

async function initHealthConnect(): Promise<boolean> {
  if (!healthConnect) return false;

  try {
    const initialized = await healthConnect.initialize();
    if (!initialized) {
      console.log('[health-bridge] Health Connect initialization failed');
      return false;
    }

    await healthConnect.requestPermission([
      { accessType: 'read', recordType: 'HeartRate' },
      { accessType: 'read', recordType: 'HeartRateVariabilityRmssd' },
      { accessType: 'read', recordType: 'SleepSession' },
      { accessType: 'read', recordType: 'RestingHeartRate' },
    ]);

    console.log('[health-bridge] Health Connect initialized and permissions requested');
    return true;
  } catch (e) {
    console.log('[health-bridge] Health Connect init error:', e);
    return false;
  }
}

function getAppleHeartRate(startDate: string): Promise<{ value: number; date: string } | null> {
  return new Promise((resolve) => {
    if (!appleHealthKit) { resolve(null); return; }
    appleHealthKit.getHeartRateSamples(
      { unit: 'bpm', startDate, ascending: false, limit: 1 },
      (err, results) => {
        if (err || !results?.length) { resolve(null); return; }
        resolve({ value: Math.round(results[0].value), date: results[0].startDate });
      },
    );
  });
}

function getAppleHRV(startDate: string): Promise<{ value: number; date: string } | null> {
  return new Promise((resolve) => {
    if (!appleHealthKit) { resolve(null); return; }
    appleHealthKit.getHeartRateVariabilitySamples(
      { startDate, ascending: false, limit: 1 },
      (err, results) => {
        if (err || !results?.length) { resolve(null); return; }
        resolve({ value: Math.round(results[0].value), date: results[0].startDate });
      },
    );
  });
}

function getAppleSleep(startDate: string): Promise<{ hours: number; date: string } | null> {
  return new Promise((resolve) => {
    if (!appleHealthKit) { resolve(null); return; }
    appleHealthKit.getSleepSamples(
      { startDate, limit: 10 },
      (err, results) => {
        if (err || !results?.length) { resolve(null); return; }
        let totalMs = 0;
        for (const s of results) {
          const start = new Date(s.startDate).getTime();
          const end = new Date(s.endDate).getTime();
          totalMs += end - start;
        }
        const hours = Number((totalMs / (1000 * 60 * 60)).toFixed(1));
        resolve({ hours, date: results[0].startDate });
      },
    );
  });
}

async function getHealthConnectHeartRate(startTime: string, endTime: string): Promise<number | null> {
  if (!healthConnect) return null;
  try {
    const result = await healthConnect.readRecords('HeartRate', {
      timeRangeFilter: { operator: 'between', startTime, endTime },
    });
    const records = result?.records ?? [];
    if (records.length === 0) return null;
    const last = records[records.length - 1] as { samples?: Array<{ beatsPerMinute: number }> };
    const bpm = last?.samples?.[0]?.beatsPerMinute;
    return bpm ? Math.round(bpm) : null;
  } catch (e) {
    console.log('[health-bridge] HC getHeartRate error:', e);
    return null;
  }
}

async function getHealthConnectHRV(startTime: string, endTime: string): Promise<number | null> {
  if (!healthConnect) return null;
  try {
    const result = await healthConnect.readRecords('HeartRateVariabilityRmssd', {
      timeRangeFilter: { operator: 'between', startTime, endTime },
    });
    const records = result?.records ?? [];
    if (records.length === 0) return null;
    const last = records[records.length - 1] as { heartRateVariabilityMillis?: number };
    return last?.heartRateVariabilityMillis ? Math.round(last.heartRateVariabilityMillis) : null;
  } catch (e) {
    console.log('[health-bridge] HC getHRV error:', e);
    return null;
  }
}

async function getHealthConnectSleep(startTime: string, endTime: string): Promise<number | null> {
  if (!healthConnect) return null;
  try {
    const result = await healthConnect.readRecords('SleepSession', {
      timeRangeFilter: { operator: 'between', startTime, endTime },
    });
    const records = result?.records ?? [];
    if (records.length === 0) return null;
    let totalMs = 0;
    for (const r of records) {
      const rec = r as { startTime?: string; endTime?: string };
      if (rec.startTime && rec.endTime) {
        totalMs += new Date(rec.endTime).getTime() - new Date(rec.startTime).getTime();
      }
    }
    return Number((totalMs / (1000 * 60 * 60)).toFixed(1));
  } catch (e) {
    console.log('[health-bridge] HC getSleep error:', e);
    return null;
  }
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

  const hasNative = await loadNativeModules();

  if (hasNative) {
    console.log('[health-bridge] Native module detected for', platform);
    return {
      available: true,
      authorized: false,
      platform,
      message: 'Prêt à se connecter.',
    };
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

  await loadNativeModules();

  if (Platform.OS === 'ios' && appleHealthKit) {
    const result = await initAppleHealthKit();
    console.log('[health-bridge] HealthKit permissions result:', result);
    return result;
  }

  if (Platform.OS === 'android' && healthConnect) {
    const result = await initHealthConnect();
    console.log('[health-bridge] Health Connect permissions result:', result);
    return result;
  }

  console.log('[health-bridge] Using simulated permission grant (native module not available)');
  return platform !== 'none';
}

export async function fetchLatestHealthData(): Promise<HealthSample | null> {
  const platform = getHealthPlatform();
  console.log('[health-bridge] fetchLatestHealthData for:', platform);

  await loadNativeModules();

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  if (Platform.OS === 'ios' && appleHealthKit) {
    try {
      const startDate = yesterday.toISOString();
      const [hr, hrv, sleep] = await Promise.all([
        getAppleHeartRate(startDate),
        getAppleHRV(startDate),
        getAppleSleep(startDate),
      ]);

      if (hr && hrv) {
        const sample: HealthSample = {
          heartRate: hr.value,
          hrv: hrv.value,
          sleepHours: sleep?.hours ?? 0,
          sleepScore: computeSleepScore(sleep?.hours ?? 0),
          stress: clampStress(hrv.value),
          timestamp: hr.date,
        };
        console.log('[health-bridge] Got REAL HealthKit data:', { hr: sample.heartRate, hrv: sample.hrv, sleep: sample.sleepHours });
        return sample;
      }
    } catch (e) {
      console.log('[health-bridge] HealthKit fetchLatest error:', e);
    }
  }

  if (Platform.OS === 'android' && healthConnect) {
    try {
      const startTime = yesterday.toISOString();
      const endTime = now.toISOString();
      const [hr, hrv, sleepHours] = await Promise.all([
        getHealthConnectHeartRate(startTime, endTime),
        getHealthConnectHRV(startTime, endTime),
        getHealthConnectSleep(startTime, endTime),
      ]);

      if (hr !== null && hrv !== null) {
        const sample: HealthSample = {
          heartRate: hr,
          hrv,
          sleepHours: sleepHours ?? 0,
          sleepScore: computeSleepScore(sleepHours ?? 0),
          stress: clampStress(hrv),
          timestamp: now.toISOString(),
        };
        console.log('[health-bridge] Got REAL Health Connect data:', { hr: sample.heartRate, hrv: sample.hrv, sleep: sample.sleepHours });
        return sample;
      }
    } catch (e) {
      console.log('[health-bridge] Health Connect fetchLatest error:', e);
    }
  }

  console.log('[health-bridge] No native data — app will use generated data');
  return null;
}

export async function fetchHealthHistory(days: number): Promise<HealthSample[]> {
  const platform = getHealthPlatform();
  console.log('[health-bridge] fetchHealthHistory for:', platform, 'days:', days);

  await loadNativeModules();

  const now = new Date();
  const samples: HealthSample[] = [];

  if (Platform.OS === 'ios' && appleHealthKit) {
    try {
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

      const [hrResults, hrvResults, sleepResults] = await Promise.all([
        new Promise<Array<{ value: number; startDate: string }>>((resolve) => {
          appleHealthKit!.getHeartRateSamples(
            { unit: 'bpm', startDate, ascending: true, limit: days * 24 },
            (err, results) => resolve(err ? [] : results ?? []),
          );
        }),
        new Promise<Array<{ value: number; startDate: string }>>((resolve) => {
          appleHealthKit!.getHeartRateVariabilitySamples(
            { startDate, ascending: true, limit: days },
            (err, results) => resolve(err ? [] : results ?? []),
          );
        }),
        new Promise<Array<{ value: number; startDate: string; endDate: string }>>((resolve) => {
          appleHealthKit!.getSleepSamples(
            { startDate, limit: days * 5 },
            (err, results) => resolve(err ? [] : results ?? []),
          );
        }),
      ]);

      const dayMap = new Map<string, { hrs: number[]; hrvs: number[]; sleepMs: number; date: string }>();

      for (const hr of hrResults) {
        const dayKey = hr.startDate.slice(0, 10);
        const entry = dayMap.get(dayKey) ?? { hrs: [], hrvs: [], sleepMs: 0, date: hr.startDate };
        entry.hrs.push(Math.round(hr.value));
        dayMap.set(dayKey, entry);
      }

      for (const h of hrvResults) {
        const dayKey = h.startDate.slice(0, 10);
        const entry = dayMap.get(dayKey) ?? { hrs: [], hrvs: [], sleepMs: 0, date: h.startDate };
        entry.hrvs.push(Math.round(h.value));
        dayMap.set(dayKey, entry);
      }

      for (const s of sleepResults) {
        const dayKey = s.startDate.slice(0, 10);
        const entry = dayMap.get(dayKey) ?? { hrs: [], hrvs: [], sleepMs: 0, date: s.startDate };
        entry.sleepMs += new Date(s.endDate).getTime() - new Date(s.startDate).getTime();
        dayMap.set(dayKey, entry);
      }

      const sortedDays = Array.from(dayMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

      for (const [, data] of sortedDays) {
        const avgHr = data.hrs.length > 0 ? Math.round(data.hrs.reduce((a, b) => a + b, 0) / data.hrs.length) : 70;
        const avgHrv = data.hrvs.length > 0 ? Math.round(data.hrvs.reduce((a, b) => a + b, 0) / data.hrvs.length) : 50;
        const sleepHours = Number((data.sleepMs / (1000 * 60 * 60)).toFixed(1));

        samples.push({
          heartRate: avgHr,
          hrv: avgHrv,
          sleepHours,
          sleepScore: computeSleepScore(sleepHours),
          stress: clampStress(avgHrv),
          timestamp: data.date,
        });
      }

      if (samples.length > 0) {
        console.log('[health-bridge] Got REAL HealthKit history:', samples.length, 'days');
        return samples;
      }
    } catch (e) {
      console.log('[health-bridge] HealthKit history error:', e);
    }
  }

  if (Platform.OS === 'android' && healthConnect) {
    try {
      const startTime = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
      const endTime = now.toISOString();

      const [hrResult, hrvResult, sleepResult] = await Promise.all([
        healthConnect.readRecords('HeartRate', { timeRangeFilter: { operator: 'between', startTime, endTime } }),
        healthConnect.readRecords('HeartRateVariabilityRmssd', { timeRangeFilter: { operator: 'between', startTime, endTime } }),
        healthConnect.readRecords('SleepSession', { timeRangeFilter: { operator: 'between', startTime, endTime } }),
      ]);

      const dayMap = new Map<string, { hrs: number[]; hrvs: number[]; sleepMs: number; date: string }>();

      for (const r of hrResult?.records ?? []) {
        const rec = r as { time?: string; startTime?: string; samples?: Array<{ beatsPerMinute: number; time: string }> };
        const recSamples = rec.samples ?? [];
        for (const s of recSamples) {
          const dayKey = (s.time ?? '').slice(0, 10);
          if (!dayKey) continue;
          const entry = dayMap.get(dayKey) ?? { hrs: [], hrvs: [], sleepMs: 0, date: s.time };
          entry.hrs.push(Math.round(s.beatsPerMinute));
          dayMap.set(dayKey, entry);
        }
      }

      for (const r of hrvResult?.records ?? []) {
        const rec = r as { time?: string; heartRateVariabilityMillis?: number };
        const dayKey = (rec.time ?? '').slice(0, 10);
        if (!dayKey || !rec.heartRateVariabilityMillis) continue;
        const entry = dayMap.get(dayKey) ?? { hrs: [], hrvs: [], sleepMs: 0, date: rec.time! };
        entry.hrvs.push(Math.round(rec.heartRateVariabilityMillis));
        dayMap.set(dayKey, entry);
      }

      for (const r of sleepResult?.records ?? []) {
        const rec = r as { startTime?: string; endTime?: string };
        if (!rec.startTime || !rec.endTime) continue;
        const dayKey = rec.startTime.slice(0, 10);
        const entry = dayMap.get(dayKey) ?? { hrs: [], hrvs: [], sleepMs: 0, date: rec.startTime };
        entry.sleepMs += new Date(rec.endTime).getTime() - new Date(rec.startTime).getTime();
        dayMap.set(dayKey, entry);
      }

      const sortedDays = Array.from(dayMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

      for (const [, data] of sortedDays) {
        const avgHr = data.hrs.length > 0 ? Math.round(data.hrs.reduce((a, b) => a + b, 0) / data.hrs.length) : 70;
        const avgHrv = data.hrvs.length > 0 ? Math.round(data.hrvs.reduce((a, b) => a + b, 0) / data.hrvs.length) : 50;
        const sleepHours = Number((data.sleepMs / (1000 * 60 * 60)).toFixed(1));

        samples.push({
          heartRate: avgHr,
          hrv: avgHrv,
          sleepHours,
          sleepScore: computeSleepScore(sleepHours),
          stress: clampStress(avgHrv),
          timestamp: data.date,
        });
      }

      if (samples.length > 0) {
        console.log('[health-bridge] Got REAL Health Connect history:', samples.length, 'days');
        return samples;
      }
    } catch (e) {
      console.log('[health-bridge] Health Connect history error:', e);
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
