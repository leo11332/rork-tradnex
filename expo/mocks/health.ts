export interface HealthDay {
  id: string;
  dateLabel: string;
  stress: number;
  sleepScore: number;
  sleepHours: number;
  heartRate: number;
  hrv: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function buildDateLabel(index: number) {
  const date = new Date();
  date.setDate(date.getDate() - index);

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
  }).format(date);
}

export function createMockHealthHistory(days: number): HealthDay[] {
  const items: HealthDay[] = [];

  for (let index = days - 1; index >= 0; index -= 1) {
    const seed = index + 1;
    const hrv = clamp(Math.round(68 - (Math.sin(seed * 0.7) * 12 + seed * 0.35)), 26, 88);
    const sleepHours = clamp(Number((7.4 - Math.cos(seed * 0.45) * 1.1 - (seed % 6 === 0 ? 1.4 : 0)).toFixed(1)), 4.5, 8.8);
    const sleepScore = clamp(Math.round(58 + sleepHours * 4.8 + Math.sin(seed * 0.35) * 8), 48, 95);
    const heartRate = clamp(Math.round(63 + (82 - hrv) * 0.3 + Math.cos(seed * 0.48) * 4), 54, 108);
    const stress = clamp(Math.round(100 - hrv + Math.max(0, 7 - sleepHours) * 8 + Math.sin(seed * 0.3) * 6), 12, 96);

    items.push({
      id: `day-${seed}`,
      dateLabel: buildDateLabel(index),
      stress,
      sleepScore,
      sleepHours,
      heartRate,
      hrv,
    });
  }

  return items;
}
