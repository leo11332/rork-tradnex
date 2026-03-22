import { HealthDay } from '@/mocks/health';
import { tradnexTheme } from '@/constants/tradnex-theme';

export interface Recommendation {
  title: string;
  body: string;
  color: string;
}

export function getStressColor(stress: number) {
  if (stress > 70) {
    return tradnexTheme.danger;
  }

  if (stress >= 40) {
    return tradnexTheme.warning;
  }

  return tradnexTheme.success;
}

export function getRecommendation(stress: number, sleepHours: number): Recommendation {
  if (stress > 70 && sleepHours < 6) {
    return {
      title: 'Critique',
      body: 'Ne tradez pas aujourd’hui.',
      color: tradnexTheme.danger,
    };
  }

  if (stress > 70 && sleepHours >= 6) {
    return {
      title: 'Stress élevé',
      body: 'Réduisez la taille des positions de 50%.',
      color: tradnexTheme.warning,
    };
  }

  if (stress >= 40 && stress <= 70 && sleepHours < 6) {
    return {
      title: 'Fatigue détectée',
      body: 'Tradez avec prudence.',
      color: tradnexTheme.warning,
    };
  }

  if (stress < 40 && sleepHours > 7) {
    return {
      title: 'Optimal',
      body: 'Pleine performance aujourd’hui.',
      color: tradnexTheme.success,
    };
  }

  return {
    title: 'Équilibre fragile',
    body: 'Restez discipliné et surveillez votre risque.',
    color: tradnexTheme.accent,
  };
}

export function calculateStressFromHrv(hrv: number) {
  const score = Math.round(100 - hrv);
  return Math.max(0, Math.min(100, score));
}

export function formatSleepDuration(hours: number) {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours}h${minutes.toString().padStart(2, '0')}`;
}

export function getLatestHealthDay(history: HealthDay[]) {
  return history[history.length - 1] ?? null;
}

export function getAverage<T extends keyof Pick<HealthDay, 'stress' | 'sleepHours' | 'heartRate' | 'hrv'>>(history: HealthDay[], key: T) {
  if (!history.length) {
    return 0;
  }

  const total = history.reduce((sum, item) => sum + item[key], 0);
  return Number((total / history.length).toFixed(1));
}

export function getVitalIndex(stress: number, sleepScore: number, hrv: number): number {
  const stressComponent = Math.max(0, 100 - stress);
  const hrvComponent = Math.min(100, hrv * 1.2);
  const raw = stressComponent * 0.4 + sleepScore * 0.35 + hrvComponent * 0.25;
  return Math.max(0, Math.min(100, Math.round(raw)));
}
