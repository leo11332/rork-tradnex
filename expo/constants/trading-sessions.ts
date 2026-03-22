export type TradingSessionId = 'tokyo' | 'london' | 'newyork';

export interface TradingSession {
  id: TradingSessionId;
  label: string;
  color: string;
  labelColor: string;
  exchangeTimezone: string;
  localOpen: number;
  localClose: number;
}

export const TRADING_SESSIONS: TradingSession[] = [
  {
    id: 'tokyo',
    label: 'Asiatique',
    color: 'rgba(255,149,0,0.10)',
    labelColor: '#FF9500',
    exchangeTimezone: 'Asia/Tokyo',
    localOpen: 9,
    localClose: 18,
  },
  {
    id: 'london',
    label: 'Londres',
    color: 'rgba(10,132,255,0.12)',
    labelColor: '#0A84FF',
    exchangeTimezone: 'Europe/London',
    localOpen: 8,
    localClose: 16.5,
  },
  {
    id: 'newyork',
    label: 'New York',
    color: 'rgba(255,59,48,0.10)',
    labelColor: '#FF3B30',
    exchangeTimezone: 'America/New_York',
    localOpen: 9.5,
    localClose: 16,
  },
];

export const SESSION_LABEL_COLORS: Record<string, string> = {
  tokyo: '#FF9500',
  london: '#0A84FF',
  newyork: '#FF3B30',
};

function getUtcOffsetForTimezone(timezone: string, date: Date): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(date);
    const year = parseInt(parts.find(p => p.type === 'year')?.value ?? '2026', 10);
    const month = parseInt(parts.find(p => p.type === 'month')?.value ?? '1', 10);
    const day = parseInt(parts.find(p => p.type === 'day')?.value ?? '1', 10);
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10);
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0', 10);

    const localDate = new Date(year, month - 1, day, hour, minute);
    const utcMs = date.getTime();
    const localMs = localDate.getTime();
    const diffMinutes = Math.round((localMs - utcMs) / 60000);
    return diffMinutes / 60;
  } catch {
    return 0;
  }
}

export interface ResolvedSessionTime {
  id: TradingSessionId;
  label: string;
  labelColor: string;
  startHour: number;
  endHour: number;
}

export function getSessionTimesForDate(
  sessionIds: TradingSessionId[],
  date: Date,
  userTimezone: string = 'Europe/Paris',
): ResolvedSessionTime[] {
  const userOffset = getUtcOffsetForTimezone(userTimezone, date);

  return sessionIds.map((id) => {
    const session = TRADING_SESSIONS.find(s => s.id === id);
    if (!session) return null;

    const exchangeOffset = getUtcOffsetForTimezone(session.exchangeTimezone, date);
    const diff = userOffset - exchangeOffset;

    let startHour = session.localOpen + diff;
    let endHour = session.localClose + diff;

    if (startHour < 0) startHour += 24;
    if (endHour < 0) endHour += 24;
    if (startHour >= 24) startHour -= 24;
    if (endHour >= 24) endHour -= 24;

    return {
      id: session.id,
      label: session.label,
      labelColor: session.labelColor,
      startHour,
      endHour,
    };
  }).filter(Boolean) as ResolvedSessionTime[];
}

export function getChartWindowForResolvedSessions(
  sessions: ResolvedSessionTime[],
): { startHour: number; endHour: number } {
  if (sessions.length === 0) {
    return { startHour: 0, endHour: 24 };
  }

  if (sessions.length === 1) {
    const s = sessions[0];
    let start = s.startHour;
    let end = s.endHour;
    if (end < start) end += 24;

    const sessionDuration = end - start;
    const margin = Math.max(2, sessionDuration * 0.4);

    const chartStart = start - margin;
    const chartEnd = end + margin;

    return { startHour: chartStart, endHour: chartEnd };
  }

  let allStarts: number[] = [];
  let allEnds: number[] = [];
  for (const s of sessions) {
    let start = s.startHour;
    let end = s.endHour;
    if (end < start) end += 24;
    allStarts.push(start);
    allEnds.push(end);
  }

  const minStart = Math.min(...allStarts);
  const maxEnd = Math.max(...allEnds);
  const totalSpan = maxEnd - minStart;
  const margin = Math.max(1.5, totalSpan * 0.15);

  return { startHour: minStart - margin, endHour: maxEnd + margin };
}

export function getChartWindowForSessions(selectedIds: TradingSessionId[]): { startHour: number; endHour: number } {
  if (selectedIds.length === 0) {
    return { startHour: 0, endHour: 24 };
  }

  const now = new Date();
  const resolved = getSessionTimesForDate(selectedIds, now, 'Europe/Paris');
  return getChartWindowForResolvedSessions(resolved);
}

export const TIMEZONE_OPTIONS = [
  { label: 'Paris (CET/CEST)', value: 'Europe/Paris' },
  { label: 'Londres (GMT/BST)', value: 'Europe/London' },
  { label: 'New York (EST/EDT)', value: 'America/New_York' },
  { label: 'Tokyo (JST)', value: 'Asia/Tokyo' },
  { label: 'Sydney (AEST)', value: 'Australia/Sydney' },
  { label: 'Dubai (GST)', value: 'Asia/Dubai' },
  { label: 'Hong Kong (HKT)', value: 'Asia/Hong_Kong' },
] as const;

export type TimezoneValue = typeof TIMEZONE_OPTIONS[number]['value'];
