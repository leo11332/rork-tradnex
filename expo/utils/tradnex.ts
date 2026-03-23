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
      title: 'Vigilance maximale',
      body: 'Conditions très défavorables — soyez extrêmement prudent et surveillez votre risque.',
      color: tradnexTheme.danger,
    };
  }

  if (stress > 70 && sleepHours >= 6) {
    return {
      title: 'Stress élevé',
      body: 'Votre stress est élevé — restez patient et discipliné.',
      color: tradnexTheme.warning,
    };
  }

  if (stress >= 40 && stress <= 70 && sleepHours < 6) {
    return {
      title: 'Fatigue détectée',
      body: 'Sommeil insuffisant — soyez particulièrement attentif à vos émotions.',
      color: tradnexTheme.warning,
    };
  }

  if (stress < 40 && sleepHours > 7) {
    return {
      title: 'Optimal',
      body: 'Conditions favorables — restez concentré et discipliné.',
      color: tradnexTheme.success,
    };
  }

  return {
    title: 'Équilibre fragile',
    body: 'Restez discipliné et patient aujourd\'hui.',
    color: tradnexTheme.accent,
  };
}

export function getPreSessionAdvice(score: number): string {
  if (score >= 85) {
    return 'Excellentes conditions — restez concentré et discipliné.';
  }
  if (score >= 70) {
    return 'Bonnes conditions — gardez votre plan et restez patient.';
  }
  if (score >= 55) {
    return 'Conditions correctes — soyez particulièrement patient et attentif.';
  }
  if (score >= 40) {
    return 'Conditions fragiles — redoublez de prudence et limitez vos prises de risque.';
  }
  if (score >= 25) {
    return 'Conditions défavorables — surveillez votre risque et restez très prudent.';
  }
  return 'Conditions très défavorables — vigilance maximale, surveillez votre risque.';
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
