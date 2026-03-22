export interface HourlyStressPoint {
  hour: number;
  label: string;
  stress: number;
  heartRate: number;
  hrv: number;
}

export interface DayDetail {
  id: string;
  date: Date;
  dayLabel: string;
  dateLabel: string;
  hourlyData: HourlyStressPoint[];
  avgStress: number;
  avgHeartRate: number;
  sleepHours: number;
  sleepScore: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function buildHourlyData(seed: number): HourlyStressPoint[] {
  const points: HourlyStressPoint[] = [];

  for (let h = 0; h < 24; h++) {
    const baseSeed = seed * 100 + h;
    const isSleep = h >= 0 && h < 7;
    const isMorning = h >= 7 && h < 10;
    const isTradingPeak = h >= 14 && h < 18;
    const isEvening = h >= 20;

    let baseStress = 45;
    if (isSleep) baseStress = 20 + Math.sin(baseSeed * 0.3) * 8;
    else if (isMorning) baseStress = 35 + Math.cos(baseSeed * 0.5) * 10;
    else if (isTradingPeak) baseStress = 62 + Math.sin(baseSeed * 0.4) * 18;
    else if (isEvening) baseStress = 38 + Math.cos(baseSeed * 0.6) * 12;
    else baseStress = 48 + Math.sin(baseSeed * 0.35) * 14;

    const stress = clamp(Math.round(baseStress), 8, 95);
    const hrv = clamp(Math.round(80 - stress * 0.5 + Math.sin(baseSeed * 0.2) * 6), 25, 90);
    const heartRate = clamp(Math.round(60 + stress * 0.35 + Math.cos(baseSeed * 0.3) * 5), 52, 115);

    points.push({
      hour: h,
      label: `${h.toString().padStart(2, '0')}h`,
      stress,
      heartRate,
      hrv,
    });
  }

  return points;
}

function getDayLabel(daysAgo: number): string {
  if (daysAgo === 0) return "Aujourd'hui";
  if (daysAgo === 1) return 'Hier';

  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  return dayNames[date.getDay()];
}

function getDateLabel(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);

  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
  }).format(date);
}

export function createDayDetails(days: number): DayDetail[] {
  const result: DayDetail[] = [];

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const seed = i + 1;
    const hourlyData = buildHourlyData(seed);

    const avgStress = Math.round(hourlyData.reduce((s, p) => s + p.stress, 0) / hourlyData.length);
    const avgHeartRate = Math.round(hourlyData.reduce((s, p) => s + p.heartRate, 0) / hourlyData.length);
    const sleepHours = clamp(Number((7.2 - Math.cos(seed * 0.45) * 1.1).toFixed(1)), 4.5, 8.8);
    const sleepScore = clamp(Math.round(58 + sleepHours * 4.8 + Math.sin(seed * 0.35) * 8), 48, 95);

    result.push({
      id: `day-detail-${i}`,
      date,
      dayLabel: getDayLabel(i),
      dateLabel: getDateLabel(i),
      hourlyData,
      avgStress,
      avgHeartRate,
      sleepHours,
      sleepScore,
    });
  }

  return result;
}
