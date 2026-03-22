import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const CRASH_LOG_KEY = 'tradnex-crash-logs';
const MAX_CRASH_LOGS = 50;

export interface CrashLog {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  componentStack?: string;
  platform: string;
  appVersion: string;
  screen?: string;
}

export async function reportCrash(error: Error, componentStack?: string, screen?: string): Promise<void> {
  const crashLog: CrashLog = {
    id: `crash-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    message: error.message,
    stack: error.stack?.substring(0, 1000),
    componentStack: componentStack?.substring(0, 500),
    platform: Platform.OS,
    appVersion: '1.0.0',
    screen,
  };

  console.log('[crash-reporter] Error captured:', {
    message: crashLog.message,
    platform: crashLog.platform,
    screen: crashLog.screen,
  });

  try {
    const stored = await AsyncStorage.getItem(CRASH_LOG_KEY);
    const logs: CrashLog[] = stored ? JSON.parse(stored) : [];
    logs.unshift(crashLog);
    const trimmed = logs.slice(0, MAX_CRASH_LOGS);
    await AsyncStorage.setItem(CRASH_LOG_KEY, JSON.stringify(trimmed));
    console.log('[crash-reporter] Crash log saved locally. Total logs:', trimmed.length);
  } catch (storageError) {
    console.log('[crash-reporter] Failed to save crash log:', storageError);
  }
}

export async function getCrashLogs(): Promise<CrashLog[]> {
  try {
    const stored = await AsyncStorage.getItem(CRASH_LOG_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export async function clearCrashLogs(): Promise<void> {
  await AsyncStorage.removeItem(CRASH_LOG_KEY);
  console.log('[crash-reporter] Crash logs cleared');
}

export function setupGlobalErrorHandler(): void {
  if (Platform.OS === 'web' || typeof ErrorUtils === 'undefined') {
    console.log('[crash-reporter] Skipping global error handler on web');
    return;
  }

  const originalHandler = ErrorUtils.getGlobalHandler();

  ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    console.log('[crash-reporter] Global error caught:', {
      message: error.message,
      isFatal,
    });

    void reportCrash(error, undefined, 'global');

    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });

  console.log('[crash-reporter] Global error handler installed');
}
