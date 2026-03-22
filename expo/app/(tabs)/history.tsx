import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import { Activity, BrainCircuit, ChevronLeft, ChevronRight, Info, MoonStar, TrendingDown, TrendingUp, X } from 'lucide-react-native';
import { ActivityIndicator, Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, Line, LinearGradient as SvgLinearGradient, Polyline, Rect, Stop, Text as SvgText, G } from 'react-native-svg';

import { SegmentedControl } from '@/components/segmented-control';
import { TrendChart } from '@/components/trend-chart';
import { tradnexTheme } from '@/constants/tradnex-theme';
import {
  TradingSessionId,
  getSessionTimesForDate,
  getChartWindowForResolvedSessions,
} from '@/constants/trading-sessions';
import { useTradnex } from '@/providers/tradnex-provider';
import { DayDetail, HourlyStressPoint } from '@/mocks/hourly';
import { HealthDay } from '@/mocks/health';
import { getStressColor } from '@/utils/tradnex';
import type { SessionResult } from '@/providers/tradnex-provider';

const SESSION_RESULT_OPTIONS: { value: SessionResult; label: string; color: string; icon: 'up' | 'down' | 'neutral' }[] = [
  { value: 'profitable', label: 'Profitable', color: '#00C48C', icon: 'up' },
  { value: 'neutral', label: 'Neutre', color: '#8F97A8', icon: 'neutral' },
  { value: 'loss', label: 'Perte', color: '#FF3B30', icon: 'down' },
];
import { generateText } from '@rork-ai/toolkit-sdk';

const CHART_WIDTH = 320;
const CHART_HEIGHT = 260;
const CHART_LEFT_PADDING = 38;
const CHART_PADDING = 14;
const CHART_INNER_WIDTH = CHART_WIDTH - CHART_LEFT_PADDING - CHART_PADDING;
const CHART_INNER_HEIGHT = CHART_HEIGHT - CHART_PADDING * 2 - 18;
const SESSION_BAR_Y = CHART_HEIGHT - CHART_PADDING - 12;
const SESSION_BAR_HEIGHT = 10;

interface HourlyChartProps {
  hourlyData: HourlyStressPoint[];
  selectedSessions: TradingSessionId[];
  selectedDate: Date;
  userTimezone?: string;
}

function HourlyChart({ hourlyData, selectedSessions, selectedDate, userTimezone = 'Europe/Paris' }: HourlyChartProps) {
  const resolvedSessions = useMemo(
    () => getSessionTimesForDate(selectedSessions, selectedDate, userTimezone),
    [selectedSessions, selectedDate, userTimezone],
  );

  const chartWindow = useMemo(
    () => getChartWindowForResolvedSessions(resolvedSessions),
    [resolvedSessions],
  );

  const windowSpan = useMemo(() => {
    let span = chartWindow.endHour - chartWindow.startHour;
    if (span <= 0) span += 24;
    return span;
  }, [chartWindow]);

  const normalizeHour = useCallback(
    (hour: number) => {
      let h = hour;
      if (chartWindow.startHour < 0) {
        if (h > 12) h -= 24;
      } else if (chartWindow.endHour > 24) {
        if (h < chartWindow.startHour && h < 12) h += 24;
      }
      return (h - chartWindow.startHour) / windowSpan;
    },
    [chartWindow.startHour, chartWindow.endHour, windowSpan],
  );

  const filteredData = useMemo(() => {
    const filtered = hourlyData.filter((point) => {
      const ratio = normalizeHour(point.hour);
      return ratio >= -0.01 && ratio <= 1.01;
    });
    filtered.sort((a, b) => normalizeHour(a.hour) - normalizeHour(b.hour));
    return filtered;
  }, [hourlyData, normalizeHour]);

  const points = useMemo(() => {
    return filteredData.map((point) => {
      const ratio = Math.max(0, Math.min(1, normalizeHour(point.hour)));
      const x = CHART_LEFT_PADDING + ratio * CHART_INNER_WIDTH;
      const y = CHART_PADDING + (1 - point.stress / 100) * CHART_INNER_HEIGHT;
      return { x, y, stress: point.stress, hour: point.hour };
    });
  }, [filteredData, normalizeHour]);

  const stressZones = useMemo(() => {
    const zones: { x: number; y: number; width: number; height: number; opacity: number }[] = [];
    if (points.length < 2) return zones;

    for (let i = 0; i < points.length - 1; i++) {
      const p = points[i];
      const avgStress = (points[i].stress + points[i + 1].stress) / 2;
      const nextX = points[i + 1].x;
      const segWidth = nextX - p.x;

      if (avgStress >= 50) {
        const intensity = Math.min(1, (avgStress - 50) / 50);
        zones.push({
          x: p.x,
          y: CHART_PADDING,
          width: segWidth,
          height: CHART_INNER_HEIGHT,
          opacity: intensity * 0.22,
        });
      }
    }
    return zones;
  }, [points]);

  const sessionArrows = useMemo(() => {
    return resolvedSessions.map((session) => {
      let startRatio = normalizeHour(session.startHour);
      let endRatio = normalizeHour(session.endHour);
      if (endRatio < startRatio) {
        endRatio = normalizeHour(session.endHour + 24);
      }
      startRatio = Math.max(0, Math.min(1, startRatio));
      endRatio = Math.max(0, Math.min(1, endRatio));

      const x1 = CHART_LEFT_PADDING + startRatio * CHART_INNER_WIDTH;
      const x2 = CHART_LEFT_PADDING + endRatio * CHART_INNER_WIDTH;
      const width = x2 - x1;

      return {
        id: session.id,
        label: session.label,
        labelColor: session.labelColor,
        x: x1,
        width,
        startLabel: formatHourLabel(session.startHour),
        endLabel: formatHourLabel(session.endHour),
      };
    }).filter((r) => r.width > 2);
  }, [resolvedSessions, normalizeHour]);

  const yAxisTicks = [0, 25, 50, 75, 100];

  const hourLabels = useMemo(() => {
    const labels: { hour: number; displayHour: number }[] = [];
    const step = windowSpan <= 12 ? 2 : 4;
    const start = Math.ceil(chartWindow.startHour);
    for (let h = start; h <= chartWindow.startHour + windowSpan; h += step) {
      let displayH = h;
      if (displayH < 0) displayH += 24;
      if (displayH >= 24) displayH -= 24;
      labels.push({ hour: h, displayHour: displayH });
    }
    return labels;
  }, [chartWindow.startHour, windowSpan]);

  const polylineStr = useMemo(() => {
    if (points.length < 2) return '';
    return points.map((p) => `${p.x},${p.y}`).join(' ');
  }, [points]);

  return (
    <View style={chartStyles.container}>
      <Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}>
        <Defs>
          <SvgLinearGradient id="stressRedGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FF3B30" stopOpacity="0.35" />
            <Stop offset="0.5" stopColor="#FF3B30" stopOpacity="0.12" />
            <Stop offset="1" stopColor="#FF3B30" stopOpacity="0" />
          </SvgLinearGradient>
          <SvgLinearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FF3B30" stopOpacity="1" />
            <Stop offset="0.4" stopColor="#FF9500" stopOpacity="1" />
            <Stop offset="1" stopColor="#00C48C" stopOpacity="1" />
          </SvgLinearGradient>
        </Defs>

        <Rect
          x={CHART_LEFT_PADDING}
          y={CHART_PADDING}
          width={CHART_INNER_WIDTH}
          height={CHART_INNER_HEIGHT}
          rx={6}
          fill="rgba(255,255,255,0.02)"
        />

        {stressZones.map((zone, i) => (
          <Rect
            key={`stress-zone-${i}`}
            x={zone.x}
            y={zone.y}
            width={zone.width}
            height={zone.height}
            fill="#FF3B30"
            opacity={zone.opacity}
          />
        ))}

        <Rect
          x={CHART_LEFT_PADDING}
          y={CHART_PADDING}
          width={CHART_INNER_WIDTH}
          height={CHART_INNER_HEIGHT * 0.3}
          fill="url(#stressRedGrad)"
          opacity={0.5}
        />

        {yAxisTicks.map((tick) => {
          const y = CHART_PADDING + (1 - tick / 100) * CHART_INNER_HEIGHT;
          return (
            <React.Fragment key={`ytick-${tick}`}>
              <Line
                x1={CHART_LEFT_PADDING}
                y1={y}
                x2={CHART_WIDTH - CHART_PADDING}
                y2={y}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="1"
                strokeDasharray="3,3"
              />
              <SvgText
                x={CHART_LEFT_PADDING - 6}
                y={y + 4}
                fill="rgba(255,255,255,0.3)"
                fontSize="9"
                textAnchor="end"
              >
                {tick}
              </SvgText>
            </React.Fragment>
          );
        })}

        {polylineStr ? (
          <Polyline
            points={polylineStr}
            fill="none"
            stroke="url(#lineGrad)"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}

        {points.map((p, i) => {
          if (p.stress < 70) return null;
          return (
            <React.Fragment key={`high-stress-${i}`}>
              <Rect
                x={p.x - 1.5}
                y={p.y}
                width={3}
                height={CHART_PADDING + CHART_INNER_HEIGHT - p.y}
                fill="#FF3B30"
                opacity={0.1}
              />
            </React.Fragment>
          );
        })}

        {sessionArrows.map((arrow) => {
          const midY = SESSION_BAR_Y + SESSION_BAR_HEIGHT / 2;
          const arrowTipSize = 3;
          return (
            <G key={`session-arrow-${arrow.id}`}>
              <Line
                x1={arrow.x}
                y1={CHART_PADDING}
                x2={arrow.x}
                y2={CHART_PADDING + CHART_INNER_HEIGHT}
                stroke={arrow.labelColor}
                strokeWidth="0.7"
                strokeDasharray="3,4"
                opacity={0.25}
              />
              <Line
                x1={arrow.x + arrow.width}
                y1={CHART_PADDING}
                x2={arrow.x + arrow.width}
                y2={CHART_PADDING + CHART_INNER_HEIGHT}
                stroke={arrow.labelColor}
                strokeWidth="0.7"
                strokeDasharray="3,4"
                opacity={0.25}
              />

              <Line
                x1={arrow.x}
                y1={midY}
                x2={arrow.x + arrow.width}
                y2={midY}
                stroke={arrow.labelColor}
                strokeWidth="2"
                strokeLinecap="round"
              />

              <Line
                x1={arrow.x}
                y1={midY - arrowTipSize}
                x2={arrow.x}
                y2={midY + arrowTipSize}
                stroke={arrow.labelColor}
                strokeWidth="2"
                strokeLinecap="round"
              />

              <Line
                x1={arrow.x + arrow.width}
                y1={midY - arrowTipSize}
                x2={arrow.x + arrow.width}
                y2={midY + arrowTipSize}
                stroke={arrow.labelColor}
                strokeWidth="2"
                strokeLinecap="round"
              />

              <SvgText
                x={arrow.x + arrow.width / 2}
                y={midY - 7}
                fill={arrow.labelColor}
                fontSize="8"
                textAnchor="middle"
                fontWeight="600"
              >
                {arrow.label}
              </SvgText>
            </G>
          );
        })}
      </Svg>

      <View style={chartStyles.hoursRow}>
        {hourLabels.map((h, i) => (
          <Text key={`${h.hour}-${i}`} style={chartStyles.hourLabel}>
            {Math.floor(h.displayHour).toString().padStart(2, '0')}h
          </Text>
        ))}
      </View>

      {resolvedSessions.length > 0 ? (
        <View style={chartStyles.sessionLegend}>
          {resolvedSessions.map((s) => (
            <View key={s.id} style={chartStyles.legendItem}>
              <View style={[chartStyles.legendDot, { backgroundColor: s.labelColor }]} />
              <Text style={chartStyles.legendText}>
                {s.label} {formatHourLabel(s.startHour)}–{formatHourLabel(s.endHour)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

interface AiTrendAnalysisProps {
  history: HealthDay[];
  range: '7d' | '30d';
}

function AiTrendAnalysis({ history, range }: AiTrendAnalysisProps) {
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [_error, setError] = useState<boolean>(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const dataFingerprint = useMemo(() => {
    if (history.length === 0) return '';
    const avgStress = Math.round(history.reduce((s, d) => s + d.stress, 0) / history.length);
    const avgSleep = (history.reduce((s, d) => s + d.sleepHours, 0) / history.length).toFixed(1);
    const avgHrv = Math.round(history.reduce((s, d) => s + d.hrv, 0) / history.length);
    return `${range}-${avgStress}-${avgSleep}-${avgHrv}-${history.length}`;
  }, [history, range]);

  useEffect(() => {
    if (!dataFingerprint || history.length === 0) return;

    let cancelled = false;
    setLoading(true);
    setError(false);
    fadeAnim.setValue(0);

    const rangeLabel = range === '7d' ? '7 derniers jours' : '30 derniers jours';
    const avgStress = Math.round(history.reduce((s, d) => s + d.stress, 0) / history.length);
    const avgSleep = (history.reduce((s, d) => s + d.sleepHours, 0) / history.length).toFixed(1);
    const avgHrv = Math.round(history.reduce((s, d) => s + d.hrv, 0) / history.length);
    const avgHR = Math.round(history.reduce((s, d) => s + d.heartRate, 0) / history.length);
    const maxStress = Math.max(...history.map((d) => d.stress));
    const minSleep = Math.min(...history.map((d) => d.sleepHours));

    const stressTrend = history.length >= 3
      ? history[history.length - 1].stress - history[0].stress
      : 0;

    const prompt = `Tu es l'IA d'analyse de TRADNEX. Analyse les tendances sur les ${rangeLabel} du trader.

DONN\u00c9ES P\u00c9RIODE (${rangeLabel}) :
- Stress moyen : ${avgStress}/100 (max atteint : ${maxStress})
- Sommeil moyen : ${avgSleep}h (minimum : ${minSleep}h)
- HRV moyen : ${avgHrv} ms
- FC moyenne : ${avgHR} bpm
- Tendance stress : ${stressTrend > 5 ? 'en hausse' : stressTrend < -5 ? 'en baisse' : 'stable'}

R\u00c8GLES :
- R\u00e9ponds en fran\u00e7ais, maximum 4 phrases courtes
- Fais un r\u00e9cap factuel des tendances de la p\u00e9riode
- Si le stress est \u00e9lev\u00e9, fais-le remarquer subtilement sans alarmer
- Termine par un petit conseil d'am\u00e9lioration concret (sommeil ou gestion du stress)
- Ne parle JAMAIS de strat\u00e9gie de trading, de type de trading ou d'hydratation
- Sois factuel et bienveillant`;

    generateText({ messages: [{ role: 'user', content: prompt }] })
      .then((result) => {
        if (!cancelled) {
          setAnalysis(result);
          setLoading(false);
          Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
        }
      })
      .catch((err) => {
        console.log('[history] AI trend analysis error:', err);
        if (!cancelled) {
          setError(true);
          setLoading(false);
          setAnalysis(getFallbackTrendAnalysis(avgStress, Number(avgSleep), avgHrv, range));
          Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
        }
      });

    return () => { cancelled = true; };
  }, [dataFingerprint, history, range, fadeAnim]);

  if (history.length === 0) return null;

  return (
    <View style={aiStyles.container}>
      <View style={aiStyles.header}>
        <View style={aiStyles.iconWrap}>
          <BrainCircuit color={tradnexTheme.accent} size={16} />
        </View>
        <Text style={aiStyles.title}>Analyse IA</Text>
        <View style={aiStyles.rangeBadge}>
          <Text style={aiStyles.rangeBadgeText}>{range === '7d' ? '7j' : '30j'}</Text>
        </View>
      </View>
      {loading ? (
        <View style={aiStyles.loadingWrap}>
          <ActivityIndicator size="small" color={tradnexTheme.accent} />
          <Text style={aiStyles.loadingText}>Analyse en cours...</Text>
        </View>
      ) : (
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={aiStyles.analysisText}>{analysis}</Text>
        </Animated.View>
      )}
    </View>
  );
}

function getFallbackTrendAnalysis(avgStress: number, avgSleep: number, avgHrv: number, range: '7d' | '30d'): string {
  const period = range === '7d' ? 'cette semaine' : 'ce mois';
  const parts: string[] = [];

  if (avgStress > 65) {
    parts.push(`Votre stress moyen ${period} est \u00e9lev\u00e9 (${avgStress}/100). Restez attentif \u00e0 vos signaux corporels.`);
  } else if (avgStress > 45) {
    parts.push(`Stress mod\u00e9r\u00e9 ${period} (${avgStress}/100). Vos niveaux restent dans une zone g\u00e9rable.`);
  } else {
    parts.push(`Excellent contr\u00f4le du stress ${period} (${avgStress}/100). Vos conditions sont favorables.`);
  }

  if (avgSleep < 6.5) {
    parts.push(`Sommeil moyen de ${avgSleep}h : un d\u00e9ficit qui peut affecter vos d\u00e9cisions. Visez 7h minimum.`);
  } else if (avgSleep < 7.5) {
    parts.push(`Sommeil correct (${avgSleep}h en moyenne). Une l\u00e9g\u00e8re am\u00e9lioration serait b\u00e9n\u00e9fique.`);
  } else {
    parts.push(`Bon sommeil (${avgSleep}h). Votre r\u00e9cup\u00e9ration soutient bien vos performances.`);
  }

  if (avgHrv < 45) {
    parts.push('Privil\u00e9giez des pauses r\u00e9guli\u00e8res pour favoriser la r\u00e9cup\u00e9ration.');
  } else {
    parts.push('Maintenez cette r\u00e9gularit\u00e9 pour rester performant.');
  }

  return parts.join(' ');
}

function formatHourLabel(hour: number): string {
  const h = Math.floor(((hour % 24) + 24) % 24);
  const m = Math.round((hour - Math.floor(hour)) * 60);
  if (m === 0) return `${h.toString().padStart(2, '0')}h`;
  return `${h.toString().padStart(2, '0')}h${m.toString().padStart(2, '0')}`;
}

interface CalendarGridProps {
  days: DayDetail[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

const WEEKS_PER_PAGE = 1;

function CalendarGrid({ days, selectedIndex, onSelect }: CalendarGridProps) {
  const [pageOffset, setPageOffset] = useState<number>(0);
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const dayMap = useMemo(() => {
    const map = new Map<string, { index: number; day: DayDetail }>();
    days.forEach((day, index) => {
      const key = `${day.date.getFullYear()}-${day.date.getMonth()}-${day.date.getDate()}`;
      map.set(key, { index, day });
    });
    return map;
  }, [days]);

  const weeksData = useMemo(() => {
    const todayDow = today.getDay();
    const mondayOffset = todayDow === 0 ? 6 : todayDow - 1;
    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() - mondayOffset);

    const startMonday = new Date(thisMonday);
    startMonday.setDate(thisMonday.getDate() - (pageOffset + WEEKS_PER_PAGE - 1) * 7);

    const weeks: Array<Array<{ date: Date; dayNum: number; dataIndex: number | null; stress: number | null; isFuture: boolean; isToday: boolean }>> = [];

    for (let w = 0; w < WEEKS_PER_PAGE; w++) {
      const week: typeof weeks[number] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(startMonday);
        date.setDate(startMonday.getDate() + w * 7 + d);
        date.setHours(0, 0, 0, 0);
        const isFuture = date.getTime() > today.getTime();
        const isToday = date.getTime() === today.getTime();
        const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        const entry = dayMap.get(key);
        week.push({
          date,
          dayNum: date.getDate(),
          dataIndex: entry && !isFuture ? entry.index : null,
          stress: entry && !isFuture ? entry.day.avgStress : null,
          isFuture,
          isToday,
        });
      }
      weeks.push(week);
    }
    return weeks;
  }, [today, pageOffset, dayMap]);

  const rangeLabel = useMemo(() => {
    if (weeksData.length === 0) return '';
    const first = weeksData[0][0].date;
    const last = weeksData[weeksData.length - 1][6].date;
    const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    return `${fmt(first)} — ${fmt(last)}`;
  }, [weeksData]);

  const weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const canGoForward = pageOffset > 0;

  return (
    <View style={calStyles.wrapper}>
      <View style={calStyles.navRow}>
        <Pressable onPress={() => setPageOffset((p) => p + 1)} hitSlop={12} testID="cal-prev">
          <ChevronLeft color={tradnexTheme.textSecondary} size={22} />
        </Pressable>
        <Text style={calStyles.rangeLabel}>{rangeLabel}</Text>
        <Pressable
          onPress={() => canGoForward && setPageOffset((p) => Math.max(0, p - 1))}
          hitSlop={12}
          testID="cal-next"
          style={{ opacity: canGoForward ? 1 : 0.25 }}
        >
          <ChevronRight color={tradnexTheme.textSecondary} size={22} />
        </Pressable>
      </View>
      <View style={calStyles.weekRow}>
        {weekDays.map((label, i) => (
          <View key={i} style={calStyles.weekCell}>
            <Text style={calStyles.weekText}>{label}</Text>
          </View>
        ))}
      </View>
      {weeksData.map((week, wi) => (
        <View key={`week-${wi}`} style={calStyles.weekGridRow}>
          {week.map((cell) => {
            const hasData = cell.dataIndex !== null && !cell.isFuture;
            const isSelected = hasData && cell.dataIndex === selectedIndex;
            const stressColor = cell.stress !== null ? getStressColor(cell.stress) : undefined;

            return (
              <Pressable
                key={`day-${cell.date.getTime()}`}
                style={[
                  calStyles.cell,
                  hasData && calStyles.cellHasData,
                  isSelected && calStyles.cellSelected,
                  cell.isFuture && calStyles.cellFuture,
                ]}
                onPress={() => {
                  if (hasData && cell.dataIndex !== null) {
                    onSelect(cell.dataIndex);
                  }
                }}
                disabled={cell.isFuture || !hasData}
                testID={`cal-day-${cell.dayNum}`}
              >
                <Text style={[
                  calStyles.dayNum,
                  !hasData && calStyles.dayNumNoData,
                  isSelected && calStyles.dayNumSelected,
                  cell.isToday && !isSelected && calStyles.dayNumToday,
                  cell.isFuture && calStyles.dayNumFuture,
                ]}>
                  {cell.dayNum}
                </Text>
                {stressColor && !cell.isFuture ? (
                  <View style={[calStyles.stressDot, { backgroundColor: stressColor }]} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

interface SessionResultBarProps {
  selectedDate: Date;
  score: number;
  sessionLogs: { date: string; result: SessionResult; score: number }[];
  onLog: (date: string, result: SessionResult, score: number) => void;
  onRemove: (date: string) => void;
}

function SessionResultBar({ selectedDate, score, sessionLogs, onLog, onRemove }: SessionResultBarProps) {
  const dateKey = useMemo(() => {
    const d = selectedDate;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, [selectedDate]);

  const existingLog = useMemo(() => {
    return sessionLogs.find((l) => l.date === dateKey) ?? null;
  }, [sessionLogs, dateKey]);

  const isFuture = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(selectedDate);
    d.setHours(0, 0, 0, 0);
    return d.getTime() > today.getTime();
  }, [selectedDate]);

  if (isFuture) return null;

  if (existingLog) {
    const opt = SESSION_RESULT_OPTIONS.find((o) => o.value === existingLog.result);
    return (
      <View style={sessionStyles.loggedRow}>
        <View style={[sessionStyles.loggedPill, { backgroundColor: (opt?.color ?? '#8F97A8') + '18' }]}>
          {opt?.icon === 'up' ? <TrendingUp color={opt.color} size={14} /> : opt?.icon === 'down' ? <TrendingDown color={opt.color} size={14} /> : <Activity color={opt?.color ?? '#8F97A8'} size={14} />}
          <Text style={[sessionStyles.loggedText, { color: opt?.color ?? '#8F97A8' }]}>{opt?.label ?? existingLog.result}</Text>
          <Text style={sessionStyles.loggedScore}>Score {existingLog.score}</Text>
        </View>
        <Pressable onPress={() => onRemove(dateKey)} hitSlop={8} testID="remove-session-log">
          <X color={tradnexTheme.textMuted} size={16} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={sessionStyles.container}>
      <Text style={sessionStyles.question}>Comment s'est passée votre session ?</Text>
      <View style={sessionStyles.optionsRow}>
        {SESSION_RESULT_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            style={[sessionStyles.optionBtn, { borderColor: opt.color + '35' }]}
            onPress={() => onLog(dateKey, opt.value, score)}
            testID={`log-session-${opt.value}`}
          >
            {opt.icon === 'up' ? <TrendingUp color={opt.color} size={16} /> : opt.icon === 'down' ? <TrendingDown color={opt.color} size={16} /> : <Activity color={opt.color} size={16} />}
            <Text style={[sessionStyles.optionText, { color: opt.color }]}>{opt.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

interface PatternsCardProps {
  personalPatterns: {
    totalSessions: number;
    profitableCount: number;
    lossCount: number;
    neutralCount: number;
    avgScoreProfit: number | null;
    avgScoreLoss: number | null;
    lossRateBelow50: number | null;
    bestDayName: string | null;
    bestDayRate: number | null;
  } | null;
}

function PatternsCard({ personalPatterns }: PatternsCardProps) {
  if (!personalPatterns || personalPatterns.totalSessions < 5) return null;

  const insights: string[] = [];

  if (personalPatterns.avgScoreProfit !== null && personalPatterns.avgScoreLoss !== null) {
    insights.push(`Score moyen en gain : ${personalPatterns.avgScoreProfit} vs en perte : ${personalPatterns.avgScoreLoss}`);
  }
  if (personalPatterns.lossRateBelow50 !== null && personalPatterns.lossRateBelow50 > 50) {
    insights.push(`${personalPatterns.lossRateBelow50}% de pertes lorsque votre score est inférieur à 50`);
  }
  if (personalPatterns.bestDayName) {
    insights.push(`Meilleur jour : ${personalPatterns.bestDayName} (${personalPatterns.bestDayRate}% de réussite)`);
  }

  if (insights.length === 0) return null;

  return (
    <View style={patternStyles.container}>
      <View style={patternStyles.header}>
        <BrainCircuit color={tradnexTheme.accent} size={16} />
        <Text style={patternStyles.title}>Tendances personnelles</Text>
        <View style={patternStyles.badge}>
          <Text style={patternStyles.badgeText}>{personalPatterns.totalSessions} sessions</Text>
        </View>
      </View>
      <View style={patternStyles.statsRow}>
        <View style={patternStyles.statItem}>
          <Text style={[patternStyles.statValue, { color: tradnexTheme.success }]}>{personalPatterns.profitableCount}</Text>
          <Text style={patternStyles.statLabel}>Gains</Text>
        </View>
        <View style={patternStyles.statDivider} />
        <View style={patternStyles.statItem}>
          <Text style={patternStyles.statValue}>{personalPatterns.neutralCount}</Text>
          <Text style={patternStyles.statLabel}>Neutres</Text>
        </View>
        <View style={patternStyles.statDivider} />
        <View style={patternStyles.statItem}>
          <Text style={[patternStyles.statValue, { color: tradnexTheme.danger }]}>{personalPatterns.lossCount}</Text>
          <Text style={patternStyles.statLabel}>Pertes</Text>
        </View>
      </View>
      {insights.map((insight, i) => (
        <View key={i} style={patternStyles.insightRow}>
          <View style={patternStyles.insightDot} />
          <Text style={patternStyles.insightText}>{insight}</Text>
        </View>
      ))}
    </View>
  );
}

export default function HistoryScreen() {
  const [windowRange, setWindowRange] = useState<'7d' | '30d'>('7d');
  const [infoVisible, setInfoVisible] = useState<boolean>(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const {
    healthConsentAccepted,
    isHydrating,
    dayDetails,
    settings,
    sevenDayHistory,
    thirtyDayHistory,
    averageStress,
    averageSleep,
    averageHrv,
    sessionLogs,
    personalPatterns,
    logSessionResult,
    removeSessionResult,
  } = useTradnex();

  useEffect(() => {
    if (isHydrating) return;
    if (!healthConsentAccepted) {
      router.replace('/health-permissions');
    }
  }, [healthConsentAccepted, isHydrating]);

  const selectedDay = useMemo(() => dayDetails[selectedDayIndex] ?? null, [dayDetails, selectedDayIndex]);

  const handleSelectDay = useCallback((index: number) => {
    setSelectedDayIndex(index);
  }, []);

  const selectedHistory = useMemo(() => {
    return windowRange === '7d' ? sevenDayHistory : thirtyDayHistory;
  }, [sevenDayHistory, thirtyDayHistory, windowRange]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 420, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  if (isHydrating || !healthConsentAccepted) {
    return (
      <View style={styles.background}>
        <LinearGradient colors={['#030A14', '#020609', '#000000']} style={styles.gradient}>
          <SafeAreaView edges={['top']} style={styles.safeArea}>
            <View style={styles.loadingCard}>
              <Text style={styles.loadingTitle}>Chargement</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.background}>
      <LinearGradient colors={['#030A14', '#020609', '#000000']} style={styles.gradient}>
        <SafeAreaView edges={['top']} style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} testID="screen-shell-scroll">
            <Animated.View style={[styles.inner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {selectedDay ? (
        <View style={styles.selectedDayCard}>
          <View style={styles.selectedDayHeader}>
            <View style={styles.selectedDayHeaderLeft}>
              <Text style={styles.selectedDayLabel}>{selectedDay.dayLabel}</Text>
              <Text style={styles.selectedDateLabel}>{selectedDay.dateLabel}</Text>
            </View>
            <Pressable onPress={() => setInfoVisible(true)} hitSlop={12} testID="history-info-btn">
              <Info color={tradnexTheme.textMuted} size={20} />
            </Pressable>
          </View>

          <View style={styles.miniStatsRow}>
            <View style={styles.miniStat}>
              <Text style={styles.miniStatValueSm}>{selectedDay.avgStress}</Text>
              <Text style={styles.miniStatLabel}>Stress</Text>
            </View>
            <View style={styles.miniStatDivider} />
            <View style={styles.miniStat}>
              <Text style={styles.miniStatValueSm}>{selectedDay.avgHeartRate}</Text>
              <Text style={styles.miniStatLabel}>BPM</Text>
            </View>
            <View style={styles.miniStatDivider} />
            <View style={styles.miniStat}>
              <Text style={styles.miniStatValueSm}>{selectedDay.sleepScore}</Text>
              <Text style={styles.miniStatLabel}>Sommeil</Text>
            </View>
          </View>

          <HourlyChart
            hourlyData={selectedDay.hourlyData}
            selectedSessions={settings.tradingSessions ?? ['newyork']}
            selectedDate={selectedDay.date}
            userTimezone={settings.timezone ?? 'Europe/Paris'}
          />
        </View>
      ) : null}

      {selectedDay ? (
        <SessionResultBar
          selectedDate={selectedDay.date}
          score={selectedDay.avgStress}
          sessionLogs={sessionLogs}
          onLog={logSessionResult}
          onRemove={removeSessionResult}
        />
      ) : null}

      <CalendarGrid
        days={dayDetails}
        selectedIndex={selectedDayIndex}
        onSelect={handleSelectDay}
      />

      <PatternsCard personalPatterns={personalPatterns} />

      <View style={styles.sectionDivider} />

      <View style={styles.trendHeader}>
        <Text style={styles.trendTitle}>Tendances</Text>
      </View>

      <Modal visible={infoVisible} transparent animationType="fade" onRequestClose={() => setInfoVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Comprendre vos donn{"\u00e9"}es</Text>
              <Pressable onPress={() => setInfoVisible(false)} hitSlop={12}>
                <X color={tradnexTheme.textPrimary} size={22} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalSectionTitle}>Score de stress (0–100)</Text>
              <Text style={styles.modalText}>Calcul{"\u00e9"} {"\u00e0"} partir de votre variabilit{"\u00e9"} cardiaque (HRV). Plus le score est bas, plus vous {"\u00ea"}tes d{"\u00e9"}tendu.</Text>
              <View style={styles.modalScale}>
                <View style={styles.modalScaleRow}>
                  <View style={[styles.modalDot, { backgroundColor: tradnexTheme.success }]} />
                  <Text style={styles.modalText}>0–39 : Optimal — {"\u00e9"}tat id{"\u00e9"}al pour trader</Text>
                </View>
                <View style={styles.modalScaleRow}>
                  <View style={[styles.modalDot, { backgroundColor: tradnexTheme.warning }]} />
                  <Text style={styles.modalText}>40–69 : Mod{"\u00e9"}r{"\u00e9"} — restez vigilant</Text>
                </View>
                <View style={styles.modalScaleRow}>
                  <View style={[styles.modalDot, { backgroundColor: tradnexTheme.danger }]} />
                  <Text style={styles.modalText}>70–100 : {"\u00c9"}lev{"\u00e9"} — {"\u00e9"}vitez les d{"\u00e9"}cisions risqu{"\u00e9"}es</Text>
                </View>
              </View>

              <Text style={styles.modalSectionTitle}>Sommeil (heures)</Text>
              <Text style={styles.modalText}>Dur{"\u00e9"}e totale de sommeil d{"\u00e9"}tect{"\u00e9"}e. Un bon sommeil pour un trader se situe entre 7h et 9h. En dessous de 6h, vos capacit{"\u00e9"}s de d{"\u00e9"}cision sont significativement r{"\u00e9"}duites.</Text>

              <Text style={styles.modalSectionTitle}>HRV — Variabilit{"\u00e9"} cardiaque</Text>
              <Text style={styles.modalText}>Mesur{"\u00e9"}e en millisecondes (ms). Un HRV {"\u00e9"}lev{"\u00e9"} indique une bonne r{"\u00e9"}cup{"\u00e9"}ration et une meilleure capacit{"\u00e9"} d'adaptation au stress.</Text>
              <View style={styles.modalScale}>
                <View style={styles.modalScaleRow}>
                  <View style={[styles.modalDot, { backgroundColor: tradnexTheme.success }]} />
                  <Text style={styles.modalText}>{'> 60 ms : Bonne r\u00e9cup\u00e9ration'}</Text>
                </View>
                <View style={styles.modalScaleRow}>
                  <View style={[styles.modalDot, { backgroundColor: tradnexTheme.warning }]} />
                  <Text style={styles.modalText}>40–60 ms : R{"\u00e9"}cup{"\u00e9"}ration moyenne</Text>
                </View>
                <View style={styles.modalScaleRow}>
                  <View style={[styles.modalDot, { backgroundColor: tradnexTheme.danger }]} />
                  <Text style={styles.modalText}>{'< 40 ms : R\u00e9cup\u00e9ration insuffisante'}</Text>
                </View>
              </View>

              <Text style={styles.modalSectionTitle}>Fr{"\u00e9"}quence cardiaque (BPM)</Text>
              <Text style={styles.modalText}>Votre pouls au repos. Un BPM au repos bas (50–70) est signe d'une bonne condition physique. Un BPM {"\u00e9"}lev{"\u00e9"} au repos peut indiquer du stress ou de la fatigue.</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <SegmentedControl
        options={[
          { label: '7 jours', value: '7d' },
          { label: '30 jours', value: '30d' },
        ]}
        value={windowRange}
        onChange={setWindowRange}
        testID="history-range-toggle"
      />

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Activity color={tradnexTheme.accent} size={18} />
          <Text style={styles.statValue}>{averageStress}</Text>
          <Text style={styles.statLabel}>Stress</Text>
        </View>
        <View style={styles.statCard}>
          <MoonStar color={tradnexTheme.success} size={18} />
          <Text style={styles.statValue}>{averageSleep}h</Text>
          <Text style={styles.statLabel}>Sommeil</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.hrvChip}>HRV</Text>
          <Text style={styles.statValue}>{averageHrv}</Text>
          <Text style={styles.statLabel}>Récupération</Text>
        </View>
      </View>

      <AiTrendAnalysis history={selectedHistory} range={windowRange} />

      <TrendChart
        title="Stress"
        subtitle=""
        color={tradnexTheme.accent}
        data={selectedHistory.map((item, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (selectedHistory.length - 1 - i));
          return { label: item.dateLabel, value: item.stress, dayOfWeek: d.getDay() };
        })}
        variant="line"
        testID="stress-trend-chart"
      />
      <TrendChart
        title="Sommeil"
        subtitle=""
        color={tradnexTheme.success}
        data={selectedHistory.map((item, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (selectedHistory.length - 1 - i));
          return { label: item.dateLabel, value: item.sleepHours, dayOfWeek: d.getDay() };
        })}
        variant="bar"
        testID="sleep-trend-chart"
      />
      <TrendChart
        title="HRV"
        subtitle=""
        color={tradnexTheme.warning}
        data={selectedHistory.map((item, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (selectedHistory.length - 1 - i));
          return { label: item.dateLabel, value: item.hrv, dayOfWeek: d.getDay() };
        })}
        variant="line"
        testID="hrv-trend-chart"
      />
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const calStyles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  rangeLabel: {
    color: tradnexTheme.textPrimary,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  weekText: {
    color: tradnexTheme.textMuted,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  weekGridRow: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
  },
  cellHasData: {
    borderColor: 'rgba(255,255,255,0.12)',
  },
  cellSelected: {
    backgroundColor: 'rgba(10,132,255,0.18)',
    borderColor: tradnexTheme.accent,
    borderRadius: 10,
  },
  cellFuture: {
    opacity: 0.2,
  },
  dayNum: {
    color: tradnexTheme.textPrimary,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  dayNumNoData: {
    color: tradnexTheme.textMuted,
    opacity: 0.4,
  },
  dayNumSelected: {
    color: tradnexTheme.accent,
    fontWeight: '800' as const,
  },
  dayNumToday: {
    color: tradnexTheme.accent,
  },
  dayNumFuture: {
    color: tradnexTheme.textMuted,
    opacity: 0.3,
  },
  stressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});

const aiStyles = StyleSheet.create({
  container: {
    borderRadius: 20,
    backgroundColor: 'rgba(10,132,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(10,132,255,0.15)',
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(10,132,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: tradnexTheme.textPrimary,
    fontSize: 15,
    fontWeight: '700' as const,
    flex: 1,
  },
  rangeBadge: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  rangeBadgeText: {
    color: tradnexTheme.textMuted,
    fontSize: 11,
    fontWeight: '600' as const,
  },
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  loadingText: {
    color: tradnexTheme.textMuted,
    fontSize: 13,
  },
  analysisText: {
    color: tradnexTheme.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
});

const chartStyles = StyleSheet.create({
  container: {
    gap: 6,
  },
  sessionLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: tradnexTheme.textMuted,
    fontSize: 10,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  hourLabel: {
    color: tradnexTheme.textMuted,
    fontSize: 10,
  },
});

const styles = StyleSheet.create({
  selectedDayCard: {
    borderRadius: 26,
    backgroundColor: 'rgba(10,132,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(10,132,255,0.15)',
    padding: 14,
    paddingHorizontal: 10,
    gap: 16,
  },
  selectedDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  selectedDayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  selectedDayLabel: {
    color: tradnexTheme.textPrimary,
    fontSize: 20,
    fontWeight: '800' as const,
  },
  selectedDateLabel: {
    color: tradnexTheme.textSecondary,
    fontSize: 14,
  },
  miniStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    paddingHorizontal: 8,
  },
  miniStat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  miniStatValueSm: {
    color: tradnexTheme.textPrimary,
    fontSize: 18,
    fontWeight: '700' as const,
  },
  miniStatLabel: {
    color: tradnexTheme.textMuted,
    fontSize: 11,
  },
  miniStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: tradnexTheme.border,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 8,
  },
  trendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  trendTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 22,
    fontWeight: '800' as const,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 22,
    backgroundColor: tradnexTheme.surface,
    borderWidth: 1,
    borderColor: tradnexTheme.border,
    padding: 16,
    gap: 10,
  },
  statValue: {
    color: tradnexTheme.textPrimary,
    fontSize: 22,
    fontWeight: '700' as const,
  },
  statLabel: {
    color: tradnexTheme.textMuted,
    fontSize: 12,
  },
  hrvChip: {
    alignSelf: 'flex-start',
    color: tradnexTheme.warning,
    backgroundColor: 'rgba(255,149,0,0.12)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    overflow: 'hidden',
    fontSize: 12,
    fontWeight: '700' as const,
  },
  background: {
    flex: 1,
    backgroundColor: '#000000',
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 120,
  },
  inner: {
    gap: 18,
  },
  loadingCard: {
    borderRadius: 24,
    backgroundColor: tradnexTheme.surface,
    borderWidth: 1,
    borderColor: tradnexTheme.border,
    padding: 24,
  },
  loadingTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 22,
    fontWeight: '800' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: tradnexTheme.surfaceElevated,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: tradnexTheme.border,
    padding: 22,
    maxHeight: '80%',
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 20,
    fontWeight: '800' as const,
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalSectionTitle: {
    color: tradnexTheme.accent,
    fontSize: 15,
    fontWeight: '700' as const,
    marginTop: 16,
    marginBottom: 6,
  },
  modalText: {
    color: tradnexTheme.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  modalScale: {
    gap: 8,
    marginTop: 8,
  },
  modalScaleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});

const sessionStyles = StyleSheet.create({
  container: {
    gap: 10,
  },
  question: {
    color: tradnexTheme.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  loggedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  loggedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  loggedText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  loggedScore: {
    color: tradnexTheme.textMuted,
    fontSize: 12,
  },
});

const patternStyles = StyleSheet.create({
  container: {
    borderRadius: 22,
    backgroundColor: 'rgba(10,132,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(10,132,255,0.15)',
    padding: 16,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: tradnexTheme.textPrimary,
    fontSize: 15,
    fontWeight: '700' as const,
    flex: 1,
  },
  badge: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    color: tradnexTheme.textMuted,
    fontSize: 11,
    fontWeight: '600' as const,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    color: tradnexTheme.textPrimary,
    fontSize: 20,
    fontWeight: '800' as const,
  },
  statLabel: {
    color: tradnexTheme.textMuted,
    fontSize: 11,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: tradnexTheme.border,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingLeft: 4,
  },
  insightDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: tradnexTheme.accent,
    marginTop: 6,
  },
  insightText: {
    color: tradnexTheme.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
});
