import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useMutation, useQuery } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { createMockHealthHistory, HealthDay } from '@/mocks/health';
import { createDayDetails, DayDetail } from '@/mocks/hourly';
import { TimezoneValue, TradingSessionId } from '@/constants/trading-sessions';
import {
  bootstrapSupabaseProfile,
  healthPlatformLabel,
  refreshSubscriptionStatus,
  registerNotificationIntent,
  syncHealthPayload,
} from '@/services/integrations';
import {
  sendLocalStressAlert,
  sendLocalHeartRateAlert,
} from '@/services/notifications';
import { getEnv } from '@/utils/env';
import {
  calculateStressFromHrv,
  getAverage,
  getLatestHealthDay,
  getRecommendation,
} from '@/utils/tradnex';

export interface PreSessionSessionAlert {
  enabled: boolean;
  minutesBefore: 5 | 15;
}

export interface PreSessionAlertConfig {
  tokyo: PreSessionSessionAlert;
  london: PreSessionSessionAlert;
  newyork: PreSessionSessionAlert;
}

export interface CustomAlert {
  id: string;
  stressThreshold: number;
  sleepScoreThreshold: number;
  enabled: boolean;
  message: string;
}

export type PsychologyLevel = 'stable' | 'moderate' | 'unstable';
export type PatienceLevel = 'patient' | 'moderate' | 'impatient';
export type RiskTolerance = 'conservative' | 'moderate' | 'aggressive';
export type TradingStyle = 'scalping' | 'day-trading' | 'swing';
export type SessionResult = 'profitable' | 'neutral' | 'loss';

export interface SessionLog {
  date: string;
  result: SessionResult;
  score: number;
}

export interface TraderProfile {
  psychology: PsychologyLevel;
  patience: PatienceLevel;
  riskTolerance: RiskTolerance;
  tradingStyle: TradingStyle;
}

interface UserSettings {
  stressAlertThreshold: number;
  heartRateThreshold: number;
  notificationsEnabled: boolean;
  timezone: TimezoneValue;
  customAlerts: CustomAlert[];
  traderProfile: TraderProfile;
  tradingSessions: TradingSessionId[];
  preSessionAlertEnabled: boolean;
  preSessionAlertTime: string;
  preSessionAlerts: PreSessionAlertConfig;
}

type SubscriptionState = 'trial' | 'active' | 'expired';

interface SubscriptionInfo {
  state: SubscriptionState;
  adminBypass: boolean;
  trialEndsAt: string;
  monthlyPrice: string;
  yearlyPrice: string;
}

interface PersistedTradnexState {
  healthConnected: boolean;
  healthConsentAccepted: boolean;
  settings: UserSettings;
  subscription: SubscriptionInfo;
  sessionLogs: SessionLog[];
}

const STORAGE_KEY = 'tradnex-state-v2';
const ONBOARDING_KEY = 'tradnex-onboarding-done';
const HISTORY_WINDOW = 30;

const defaultTraderProfile: TraderProfile = {
  psychology: 'moderate',
  patience: 'moderate',
  riskTolerance: 'moderate',
  tradingStyle: 'day-trading',
};

const defaultPreSessionAlerts: PreSessionAlertConfig = {
  tokyo: { enabled: false, minutesBefore: 15 },
  london: { enabled: false, minutesBefore: 15 },
  newyork: { enabled: true, minutesBefore: 15 },
};

const defaultSettings: UserSettings = {
  stressAlertThreshold: 70,
  heartRateThreshold: 100,
  notificationsEnabled: true,
  timezone: 'Europe/Paris',
  customAlerts: [],
  traderProfile: defaultTraderProfile,
  tradingSessions: ['newyork'],
  preSessionAlertEnabled: true,
  preSessionAlertTime: '09:00',
  preSessionAlerts: defaultPreSessionAlerts,
};

const defaultSubscription: SubscriptionInfo = {
  state: 'trial',
  adminBypass: false,
  trialEndsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
  monthlyPrice: '19,99€/mois',
  yearlyPrice: '149,99€/an',
};

function generateMockSessionLogs(): SessionLog[] {
  const logs: SessionLog[] = [];
  const today = new Date();
  const weights = [0.45, 0.25, 0.30];

  for (let i = 25; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    const rand = Math.random();
    let result: SessionResult;
    if (rand < weights[0]) result = 'profitable';
    else if (rand < weights[0] + weights[1]) result = 'neutral';
    else result = 'loss';

    let score: number;
    if (result === 'profitable') score = Math.round(60 + Math.random() * 35);
    else if (result === 'neutral') score = Math.round(40 + Math.random() * 30);
    else score = Math.round(15 + Math.random() * 40);

    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    logs.push({ date: dateKey, result, score });
  }
  return logs;
}

const MOCK_SESSION_LOGS = generateMockSessionLogs();

const defaultState: PersistedTradnexState = {
  healthConnected: false,
  healthConsentAccepted: false,
  settings: defaultSettings,
  subscription: defaultSubscription,
  sessionLogs: MOCK_SESSION_LOGS,
};

function buildUpdatedHistory() {
  const nextHistory = createMockHealthHistory(HISTORY_WINDOW);
  const latest = nextHistory[nextHistory.length - 1];

  if (latest) {
    latest.stress = calculateStressFromHrv(latest.hrv);
  }

  return nextHistory;
}

export const [TradnexProvider, useTradnex] = createContextHook(() => {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [subscription, setSubscription] = useState<SubscriptionInfo>(defaultSubscription);
  const [healthConnected, setHealthConnected] = useState<boolean>(false);
  const [healthConsentAccepted, setHealthConsentAccepted] = useState<boolean>(false);
  const [history, setHistory] = useState<HealthDay[]>(() => buildUpdatedHistory());
  const [dayDetails, setDayDetails] = useState<DayDetail[]>(() => createDayDetails(30));
  const [lastSyncAt, setLastSyncAt] = useState<string>(new Date().toISOString());
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>(MOCK_SESSION_LOGS);

  const persistedQuery = useQuery<PersistedTradnexState>({
    queryKey: ['tradnex', 'persisted-state'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const onboardingDone = await AsyncStorage.getItem(ONBOARDING_KEY);

      if (!stored) {
        const state = { ...defaultState };
        if (onboardingDone === 'true') {
          state.healthConsentAccepted = true;
          state.healthConnected = true;
        }
        return state;
      }

      try {
        const parsed = JSON.parse(stored) as PersistedTradnexState;
        if (onboardingDone === 'true') {
          parsed.healthConsentAccepted = true;
          parsed.healthConnected = true;
        }
        return parsed;
      } catch (error) {
        console.log('[tradnex] persistedQuery:parseError', error);
        const state = { ...defaultState };
        if (onboardingDone === 'true') {
          state.healthConsentAccepted = true;
          state.healthConnected = true;
        }
        return state;
      }
    },
  });

  const persistMutation = useMutation({
    mutationFn: async (nextState: PersistedTradnexState) => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
      return nextState;
    },
  });

  const persistState = useCallback(
    (nextState: PersistedTradnexState) => {
      console.log('[tradnex] persistState', nextState);
      persistMutation.mutate(nextState);
    },
    [persistMutation],
  );

  useEffect(() => {
    if (!persistedQuery.data) {
      return;
    }

    console.log('[tradnex] hydrated', persistedQuery.data);
    setSettings({ ...defaultSettings, ...persistedQuery.data.settings, customAlerts: persistedQuery.data.settings?.customAlerts ?? [], traderProfile: persistedQuery.data.settings?.traderProfile ?? defaultTraderProfile, tradingSessions: persistedQuery.data.settings?.tradingSessions ?? ['newyork'], preSessionAlertEnabled: persistedQuery.data.settings?.preSessionAlertEnabled ?? true, preSessionAlertTime: persistedQuery.data.settings?.preSessionAlertTime ?? '09:00', preSessionAlerts: persistedQuery.data.settings?.preSessionAlerts ?? defaultPreSessionAlerts });
    setSubscription(persistedQuery.data.subscription ?? defaultSubscription);
    setHealthConnected(persistedQuery.data.healthConnected);
    setHealthConsentAccepted(persistedQuery.data.healthConsentAccepted);
    setSessionLogs(persistedQuery.data.sessionLogs ?? []);
  }, [persistedQuery.data]);

  const refreshHealthMutation = useMutation({
    mutationFn: async () => {
      const nextHistory = buildUpdatedHistory();
      const projectId = getEnv('EXPO_PUBLIC_PROJECT_ID') || 'guest-project';
      const userId = `guest-${projectId}`;

      await syncHealthPayload(userId, nextHistory.length);
      setHistory(nextHistory);
      setDayDetails(createDayDetails(30));
      setLastSyncAt(new Date().toISOString());
      console.log('[tradnex] refreshHealthMutation:success', { count: nextHistory.length });
      return nextHistory;
    },
  });

  const connectHealthMutation = useMutation({
    mutationFn: async () => {
      const projectId = getEnv('EXPO_PUBLIC_PROJECT_ID') || 'guest-project';
      const userId = `guest-${projectId}`;

      await bootstrapSupabaseProfile(userId);
      await registerNotificationIntent(settings.stressAlertThreshold, settings.heartRateThreshold);
      setHealthConnected(true);
      persistState({
        healthConnected: true,
        healthConsentAccepted,
        settings,
        subscription,
        sessionLogs,
      });
      return refreshHealthMutation.mutateAsync();
    },
  });

  const acceptHealthConsentMutation = useMutation({
    mutationFn: async () => {
      console.log('[tradnex] acceptHealthConsentMutation:start', { platform: healthPlatformLabel });
      setHealthConsentAccepted(true);
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      persistState({
        healthConnected,
        healthConsentAccepted: true,
        settings,
        subscription,
        sessionLogs,
      });
      return connectHealthMutation.mutateAsync();
    },
  });

  useEffect(() => {
    if (!healthConnected) {
      return;
    }

    const interval = setInterval(() => {
      void refreshHealthMutation.mutateAsync();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [healthConnected, refreshHealthMutation]);

  useEffect(() => {
    void refreshSubscriptionStatus();
  }, []);

  const updateSettings = useCallback(
    (partial: Partial<UserSettings>) => {
      const nextSettings: UserSettings = {
        ...settings,
        ...partial,
      };

      setSettings(nextSettings);
      persistState({
        healthConnected,
        healthConsentAccepted,
        settings: nextSettings,
        subscription,
        sessionLogs,
      });
    },
    [healthConnected, healthConsentAccepted, persistState, settings, subscription, sessionLogs],
  );

  const logSessionResult = useCallback(
    (date: string, result: SessionResult, score: number) => {
      const existing = sessionLogs.filter((l) => l.date !== date);
      const nextLogs = [...existing, { date, result, score }];
      setSessionLogs(nextLogs);
      persistState({
        healthConnected,
        healthConsentAccepted,
        settings,
        subscription,
        sessionLogs: nextLogs,
      });
      console.log('[tradnex] logSessionResult', { date, result, score });
    },
    [healthConnected, healthConsentAccepted, persistState, settings, subscription, sessionLogs],
  );

  const removeSessionResult = useCallback(
    (date: string) => {
      const nextLogs = sessionLogs.filter((l) => l.date !== date);
      setSessionLogs(nextLogs);
      persistState({
        healthConnected,
        healthConsentAccepted,
        settings,
        subscription,
        sessionLogs: nextLogs,
      });
    },
    [healthConnected, healthConsentAccepted, persistState, settings, subscription, sessionLogs],
  );

  const personalPatterns = useMemo(() => {
    if (sessionLogs.length < 5) return null;

    const profitableLogs = sessionLogs.filter((l) => l.result === 'profitable');
    const lossLogs = sessionLogs.filter((l) => l.result === 'loss');

    const avgScoreProfit = profitableLogs.length > 0
      ? Math.round(profitableLogs.reduce((s, l) => s + l.score, 0) / profitableLogs.length)
      : null;
    const avgScoreLoss = lossLogs.length > 0
      ? Math.round(lossLogs.reduce((s, l) => s + l.score, 0) / lossLogs.length)
      : null;

    const lossBelow50 = lossLogs.filter((l) => l.score < 50).length;
    const lossRateBelow50 = sessionLogs.filter((l) => l.score < 50).length > 0
      ? Math.round((lossBelow50 / sessionLogs.filter((l) => l.score < 50).length) * 100)
      : null;

    const dayPerf = new Map<number, { wins: number; total: number }>();
    sessionLogs.forEach((log) => {
      const d = new Date(log.date).getDay();
      const entry = dayPerf.get(d) ?? { wins: 0, total: 0 };
      entry.total++;
      if (log.result === 'profitable') entry.wins++;
      dayPerf.set(d, entry);
    });

    let bestDayNum = -1;
    let bestDayRate = 0;
    dayPerf.forEach((v, k) => {
      if (v.total >= 2) {
        const rate = v.wins / v.total;
        if (bestDayNum === -1 || rate > bestDayRate) {
          bestDayNum = k;
          bestDayRate = rate;
        }
      }
    });

    const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

    return {
      totalSessions: sessionLogs.length,
      profitableCount: profitableLogs.length,
      lossCount: lossLogs.length,
      neutralCount: sessionLogs.filter((l) => l.result === 'neutral').length,
      avgScoreProfit,
      avgScoreLoss,
      lossRateBelow50,
      bestDayName: bestDayNum >= 0 ? DAY_NAMES[bestDayNum] : null,
      bestDayRate: bestDayNum >= 0 ? Math.round(bestDayRate * 100) : null,
    };
  }, [sessionLogs]);

  const addCustomAlert = useCallback(
    (alert: CustomAlert) => {
      const nextSettings: UserSettings = {
        ...settings,
        customAlerts: [...settings.customAlerts, alert],
      };
      setSettings(nextSettings);
      persistState({ healthConnected, healthConsentAccepted, settings: nextSettings, subscription, sessionLogs });
    },
    [healthConnected, healthConsentAccepted, persistState, settings, subscription, sessionLogs],
  );

  const removeCustomAlert = useCallback(
    (alertId: string) => {
      const nextSettings: UserSettings = {
        ...settings,
        customAlerts: settings.customAlerts.filter((a) => a.id !== alertId),
      };
      setSettings(nextSettings);
      persistState({ healthConnected, healthConsentAccepted, settings: nextSettings, subscription, sessionLogs });
    },
    [healthConnected, healthConsentAccepted, persistState, settings, subscription, sessionLogs],
  );

  const toggleCustomAlert = useCallback(
    (alertId: string) => {
      const nextSettings: UserSettings = {
        ...settings,
        customAlerts: settings.customAlerts.map((a) =>
          a.id === alertId ? { ...a, enabled: !a.enabled } : a,
        ),
      };
      setSettings(nextSettings);
      persistState({ healthConnected, healthConsentAccepted, settings: nextSettings, subscription, sessionLogs });
    },
    [healthConnected, healthConsentAccepted, persistState, settings, subscription, sessionLogs],
  );

  const toggleAdminBypass = useCallback(() => {
    const nextSubscription: SubscriptionInfo = {
      ...subscription,
      adminBypass: !subscription.adminBypass,
      state: !subscription.adminBypass ? 'active' : 'trial',
    };

    setSubscription(nextSubscription);
    persistState({
      healthConnected,
      healthConsentAccepted,
      settings,
      subscription: nextSubscription,
      sessionLogs,
    });
  }, [healthConnected, healthConsentAccepted, persistState, settings, subscription, sessionLogs]);

  const activatePlan = useCallback(
    (_plan: 'monthly' | 'yearly') => {
      const nextSubscription: SubscriptionInfo = {
        ...subscription,
        state: 'active',
      };

      setSubscription(nextSubscription);
      persistState({
        healthConnected,
        healthConsentAccepted,
        settings,
        subscription: nextSubscription,
        sessionLogs,
      });
    },
    [healthConnected, healthConsentAccepted, persistState, settings, subscription, sessionLogs],
  );

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setSettings(defaultSettings);
    setSubscription(defaultSubscription);
    setHealthConnected(false);
    setHealthConsentAccepted(false);
    setHistory(buildUpdatedHistory());
    setDayDetails(createDayDetails(30));
    setLastSyncAt(new Date().toISOString());
    setSessionLogs([]);
    console.log('[tradnex] logout:completed (onboarding preserved)');
  }, []);

  const latestHealth = useMemo(() => getLatestHealthDay(history), [history]);
  const recommendation = useMemo(() => {
    if (!latestHealth) {
      return null;
    }

    return getRecommendation(latestHealth.stress, latestHealth.sleepHours);
  }, [latestHealth]);

  const lastAlertFiredRef = useRef<string>('');

  const pendingAlerts = useMemo(() => {
    if (!latestHealth || !settings.notificationsEnabled) {
      return [] as string[];
    }

    const alerts: string[] = [];

    if (latestHealth.stress >= settings.stressAlertThreshold) {
      alerts.push('Stress au-dessus du seuil configuré');
    }

    if (latestHealth.heartRate >= settings.heartRateThreshold) {
      alerts.push('Fréquence cardiaque au-dessus du seuil configuré');
    }

    return alerts;
  }, [latestHealth, settings.heartRateThreshold, settings.notificationsEnabled, settings.stressAlertThreshold]);

  useEffect(() => {
    if (!latestHealth || !settings.notificationsEnabled || !healthConnected) return;
    if (Platform.OS === 'web') return;

    const alertKey = `${latestHealth.stress}-${latestHealth.heartRate}-${lastSyncAt}`;
    if (alertKey === lastAlertFiredRef.current) return;

    let fired = false;

    if (latestHealth.stress >= settings.stressAlertThreshold) {
      void sendLocalStressAlert(
        latestHealth.stress,
        `Stress à ${latestHealth.stress}/100. Restez vigilant et pensez à faire une pause si nécessaire.`,
      );
      fired = true;
    }

    if (latestHealth.heartRate >= settings.heartRateThreshold) {
      void sendLocalHeartRateAlert(latestHealth.heartRate);
      fired = true;
    }

    settings.customAlerts.forEach((customAlert) => {
      if (!customAlert.enabled) return;
      if (
        latestHealth.stress >= customAlert.stressThreshold &&
        latestHealth.sleepScore <= customAlert.sleepScoreThreshold
      ) {
        void sendLocalStressAlert(latestHealth.stress, customAlert.message);
        fired = true;
      }
    });

    if (fired) {
      lastAlertFiredRef.current = alertKey;
      console.log('[tradnex] alerts fired for key:', alertKey);
    }
  }, [latestHealth, settings, healthConnected, lastSyncAt]);

  const value = useMemo(
    () => ({
      settings,
      subscription,
      healthConnected,
      healthConsentAccepted,
      latestHealth,
      recommendation,
      pendingAlerts,
      history,
      dayDetails,
      sevenDayHistory: history.slice(-7),
      thirtyDayHistory: history.slice(-30),
      lastSyncAt,
      averageStress: getAverage(history, 'stress'),
      averageSleep: getAverage(history, 'sleepHours'),
      averageHeartRate: getAverage(history, 'heartRate'),
      averageHrv: getAverage(history, 'hrv'),
      isUsingMockData: true,
      sessionLogs,
      personalPatterns,
      connectHealthMutation,
      acceptHealthConsentMutation,
      refreshHealthMutation,
      updateSettings,
      addCustomAlert,
      removeCustomAlert,
      toggleCustomAlert,
      toggleAdminBypass,
      activatePlan,
      logSessionResult,
      removeSessionResult,
      logout,
      healthPlatformLabel,
      isHydrating: persistedQuery.isLoading,
    }),
    [
      acceptHealthConsentMutation,
      activatePlan,
      addCustomAlert,
      connectHealthMutation,
      dayDetails,
      healthConnected,
      healthConsentAccepted,
      history,
      lastSyncAt,
      latestHealth,
      logSessionResult,
      logout,
      pendingAlerts,
      persistedQuery.isLoading,
      personalPatterns,
      recommendation,
      refreshHealthMutation,
      removeCustomAlert,
      removeSessionResult,
      sessionLogs,
      settings,
      subscription,
      toggleAdminBypass,
      toggleCustomAlert,
      updateSettings,
    ],
  );

  return value;
});
