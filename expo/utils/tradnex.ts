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

export interface TradnexScoreResult {
  total: number;
  sleep: number;
  hrv: number;
  stress: number;
  heartRate: number;
}

export function computeTradnexScore(
  sleepHours: number,
  hrv: number,
  stress: number,
  heartRate: number,
  avgHrv7d: number,
  avgHr7d: number,
): TradnexScoreResult {
  let sleepPts = 0;
  if (sleepHours >= 7) sleepPts = 30;
  else if (sleepHours >= 6) sleepPts = 20;
  else if (sleepHours >= 5) sleepPts = 10;

  let hrvPts = 15;
  if (avgHrv7d > 0) {
    if (hrv > avgHrv7d) hrvPts = 30;
    else if (hrv >= avgHrv7d * 0.9) hrvPts = 20;
    else hrvPts = 5;
  }

  let stressPts = 0;
  if (stress < 40) stressPts = 20;
  else if (stress <= 70) stressPts = 10;

  let hrPts = 20;
  if (avgHr7d > 0) {
    if (heartRate > avgHr7d * 1.2) hrPts = 0;
    else if (heartRate > avgHr7d * 1.1) hrPts = 10;
  }

  return {
    total: sleepPts + hrvPts + stressPts + hrPts,
    sleep: sleepPts,
    hrv: hrvPts,
    stress: stressPts,
    heartRate: hrPts,
  };
}

export function getScoreVerdict(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Conditions optimales. Vous pouvez trader sans restriction aujourd\u2019hui.', color: '#00C48C' };
  if (score >= 60) return { label: 'Bonnes conditions. Restez disciplin\u00e9 et respectez votre plan.', color: '#4ADE80' };
  if (score >= 40) return { label: 'Conditions moyennes. R\u00e9duisez votre taille de position de 50%.', color: '#FF9500' };
  if (score >= 20) return { label: 'Conditions d\u00e9grad\u00e9es. Tradez uniquement les setups les plus clairs.', color: '#FF6B00' };
  return { label: 'Ne tradez pas aujourd\u2019hui. Votre capital d\u00e9cisionnel est trop bas.', color: '#FF3B30' };
}

export function getScoreColor(score: number): string {
  if (score >= 80) return '#00C48C';
  if (score >= 60) return '#4ADE80';
  if (score >= 40) return '#FF9500';
  if (score >= 20) return '#FF6B00';
  return '#FF3B30';
}
