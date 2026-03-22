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
  computeTradnexScore,
  getAverage,
  getLatestHealthDay,
  getRecommendation,
} from '@/utils/tradnex';
import type { TradnexScoreResult } from '@/utils/tradnex';

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
  note?: string;
}

export interface TraderProfile {
  psychology: PsychologyLevel;
  patience: PatienceLevel;
  riskTolerance: RiskTolerance;
  tradingStyle: TradingStyle;
}

export interface InsightPatterns {
  totalSessions: number;
  profitableCount: number;
  lossCount: number;
  neutralCount: number;
  scoreThreshold: number | null;
  lossRateBelowThreshold: number | null;
  bestDayName: string | null;
  bestDayRate: number | null;
  avgSleepProfitable: number | null;
  avgSleepLoss: number | null;
  avgScoreProfit: number | null;
  avgScoreLoss: number | null;
  avgScoreNeutral: number | null;
  avgHrv: number | null;
  hrvTrend7d: number | null;
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
  preSessionSessions: TradingSessionId[];
  preSessionLeadTime: '15' | '30' | '60';
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
  onboardingCompleted: boolean;
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
  preSessionSessions: ['newyork'],
  preSessionLeadTime: '30',
};

const defaultSubscription: SubscriptionInfo = {
  state: 'trial',
  adminBypass: false,
  trialEndsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
  monthlyPrice: '19,99\u20AC/mois',
  yearlyPrice: '149,99\u20AC/an',
};

const defaultState: PersistedTradnexState = {
  healthConnected: false,
  healthConsentAccepted: false,
  settings: defaultSettings,
  subscription: defaultSubscription,
  sessionLogs: [],
  onboardingCompleted: false,
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
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean>(false);

  const onboardingRef = useRef<boolean>(false);

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
    (nextState: Omit<PersistedTradnexState, 'onboardingCompleted'>) => {
      const full: PersistedTradnexState = { ...nextState, onboardingCompleted: onboardingRef.current };
      console.log('[tradnex] persistState', full);
      persistMutation.mutate(full);
    },
    [persistMutation],
  );

  useEffect(() => {
    if (!persistedQuery.data) {
      return;
    }

    console.log('[tradnex] hydrated', persistedQuery.data);
    const d = persistedQuery.data;
    setSettings({
      ...defaultSettings,
      ...d.settings,
      customAlerts: d.settings?.customAlerts ?? [],
      traderProfile: d.settings?.traderProfile ?? defaultTraderProfile,
      tradingSessions: d.settings?.tradingSessions ?? ['newyork'],
      preSessionAlertEnabled: d.settings?.preSessionAlertEnabled ?? true,
      preSessionAlertTime: d.settings?.preSessionAlertTime ?? '09:00',
      preSessionSessions: d.settings?.preSessionSessions ?? ['newyork'],
      preSessionLeadTime: d.settings?.preSessionLeadTime ?? '30',
    });
    setSubscription(d.subscription ?? defaultSubscription);
    setHealthConnected(d.healthConnected);
    setHealthConsentAccepted(d.healthConsentAccepted);
    setSessionLogs(d.sessionLogs ?? []);
    const ob = d.onboardingCompleted ?? false;
    setOnboardingCompleted(ob);
    onboardingRef.current = ob;
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
    (date: string, result: SessionResult, score: number, note?: string) => {
      const existing = sessionLogs.filter((l) => l.date !== date);
      const nextLogs = [...existing, { date, result, score, note }];
      setSessionLogs(nextLogs);
      persistState({
        healthConnected,
        healthConsentAccepted,
        settings,
        subscription,
        sessionLogs: nextLogs,
      });
      console.log('[tradnex] logSessionResult', { date, result, score, note });
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

  const insightPatterns = useMemo<InsightPatterns | null>(() => {
    if (sessionLogs.length < 5) return null;
    const profitLogs = sessionLogs.filter(l => l.result === 'profitable');
    const lossLogs = sessionLogs.filter(l => l.result === 'loss');
    const neutralLogs = sessionLogs.filter(l => l.result === 'neutral');

    const avgScoreLoss = lossLogs.length > 0 ? Math.round(lossLogs.reduce((s, l) => s + l.score, 0) / lossLogs.length) : null;
    const belowThreshold = avgScoreLoss !== null ? sessionLogs.filter(l => l.score < avgScoreLoss) : [];
    const lossesBT = belowThreshold.filter(l => l.result === 'loss').length;
    const lossRateBT = belowThreshold.length > 0 ? Math.round((lossesBT / belowThreshold.length) * 100) : null;

    const dayPerf = new Map<number, { wins: number; total: number }>();
    sessionLogs.forEach(log => {
      const d = new Date(log.date).getDay();
      const entry = dayPerf.get(d) ?? { wins: 0, total: 0 };
      entry.total++;
      if (log.result === 'profitable') entry.wins++;
      dayPerf.set(d, entry);
    });
    let bestDN = -1;
    let bestDR = 0;
    dayPerf.forEach((v, k) => {
      if (v.total >= 2) {
        const rate = v.wins / v.total;
        if (bestDN === -1 || rate > bestDR) { bestDN = k; bestDR = rate; }
      }
    });
    const DN = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

    const profitSleep: number[] = [];
    const lossSleep: number[] = [];
    sessionLogs.forEach(log => {
      const match = dayDetails.find(dd => {
        const dk = `${dd.date.getFullYear()}-${String(dd.date.getMonth() + 1).padStart(2, '0')}-${String(dd.date.getDate()).padStart(2, '0')}`;
        return dk === log.date;
      });
      if (match) {
        if (log.result === 'profitable') profitSleep.push(match.sleepHours);
        else if (log.result === 'loss') lossSleep.push(match.sleepHours);
      }
    });

    const avgScoreProfit = profitLogs.length > 0 ? Math.round(profitLogs.reduce((s, l) => s + l.score, 0) / profitLogs.length) : null;
    const avgScoreNeutral = neutralLogs.length > 0 ? Math.round(neutralLogs.reduce((s, l) => s + l.score, 0) / neutralLogs.length) : null;

    const last30 = history.slice(-30);
    const last7h = history.slice(-7);
    const avgHrvAll = last30.length > 0 ? Math.round(last30.reduce((s, d) => s + d.hrv, 0) / last30.length) : null;
    const avgHrv7 = last7h.length > 0 ? Math.round(last7h.reduce((s, d) => s + d.hrv, 0) / last7h.length) : null;
    const hrvTrend = avgHrvAll && avgHrv7 ? Math.round(((avgHrv7 - avgHrvAll) / avgHrvAll) * 100) : null;

    return {
      totalSessions: sessionLogs.length,
      profitableCount: profitLogs.length,
      lossCount: lossLogs.length,
      neutralCount: neutralLogs.length,
      scoreThreshold: avgScoreLoss,
      lossRateBelowThreshold: lossRateBT,
      bestDayName: bestDN >= 0 ? DN[bestDN] : null,
      bestDayRate: bestDN >= 0 ? Math.round(bestDR * 100) : null,
      avgSleepProfitable: profitSleep.length > 0 ? Number((profitSleep.reduce((a, b) => a + b, 0) / profitSleep.length).toFixed(1)) : null,
      avgSleepLoss: lossSleep.length > 0 ? Number((lossSleep.reduce((a, b) => a + b, 0) / lossSleep.length).toFixed(1)) : null,
      avgScoreProfit,
      avgScoreLoss,
      avgScoreNeutral,
      avgHrv: avgHrvAll,
      hrvTrend7d: hrvTrend,
    };
  }, [sessionLogs, dayDetails, history]);

  const completeOnboarding = useCallback(() => {
    onboardingRef.current = true;
    setOnboardingCompleted(true);
    persistState({
      healthConnected,
      healthConsentAccepted,
      settings,
      subscription,
      sessionLogs,
    });
    console.log('[tradnex] completeOnboarding');
  }, [healthConnected, healthConsentAccepted, persistState, settings, subscription, sessionLogs]);

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

  const tradnexScore = useMemo<TradnexScoreResult | null>(() => {
    if (!latestHealth) return null;
    const last7 = history.slice(-7);
    const avgHrv7d = last7.length > 0 ? last7.reduce((s, d) => s + d.hrv, 0) / last7.length : 0;
    const avgHr7d = last7.length > 0 ? last7.reduce((s, d) => s + d.heartRate, 0) / last7.length : latestHealth.heartRate;
    return computeTradnexScore(latestHealth.sleepHours, latestHealth.hrv, latestHealth.stress, latestHealth.heartRate, avgHrv7d, avgHr7d);
  }, [latestHealth, history]);

  const scoreHistory = useMemo(() => {
    const last7 = history.slice(-7);
    return last7.map((day, i) => {
      const priorStart = Math.max(0, history.length - 14 + i);
      const priorEnd = history.length - 7 + i;
      const priorDays = history.slice(priorStart, priorEnd);
      const avgH = priorDays.length > 0 ? priorDays.reduce((s, d) => s + d.hrv, 0) / priorDays.length : 0;
      const avgHr = priorDays.length > 0 ? priorDays.reduce((s, d) => s + d.heartRate, 0) / priorDays.length : day.heartRate;
      const sc = computeTradnexScore(day.sleepHours, day.hrv, day.stress, day.heartRate, avgH, avgHr);
      return { date: day.dateLabel, score: sc.total };
    });
  }, [history]);

  const lastAlertFiredRef = useRef<string>('');

  const pendingAlerts = useMemo(() => {
    if (!latestHealth || !settings.notificationsEnabled) {
      return [] as string[];
    }

    const alerts: string[] = [];

    if (latestHealth.stress >= settings.stressAlertThreshold) {
      alerts.push('Stress au-dessus du seuil');
    }

    if (latestHealth.heartRate >= settings.heartRateThreshold) {
      alerts.push('Fr\u00e9quence cardiaque au-dessus du seuil');
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
        `Stress \u00e0 ${latestHealth.stress}/100. R\u00e9duisez votre exposition ou prenez une pause.`,
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
      tradnexScore,
      scoreHistory,
      insightPatterns,
      onboardingCompleted,
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
      completeOnboarding,
      logout,
      healthPlatformLabel,
      isHydrating: persistedQuery.isLoading,
    }),
    [
      acceptHealthConsentMutation,
      activatePlan,
      addCustomAlert,
      completeOnboarding,
      connectHealthMutation,
      dayDetails,
      healthConnected,
      healthConsentAccepted,
      history,
      insightPatterns,
      lastSyncAt,
      latestHealth,
      logSessionResult,
      logout,
      onboardingCompleted,
      pendingAlerts,
      persistedQuery.isLoading,
      personalPatterns,
      recommendation,
      refreshHealthMutation,
      removeCustomAlert,
      removeSessionResult,
      scoreHistory,
      sessionLogs,
      settings,
      subscription,
      toggleAdminBypass,
      toggleCustomAlert,
      tradnexScore,
      updateSettings,
    ],
  );

  return value;
});
