import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import { Activity, BrainCircuit, ChevronLeft, ChevronRight, Info, MoonStar, Plus, TrendingDown, TrendingUp, X } from 'lucide-react-native';
import { ActivityIndicator, Animated, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle as SvgCircle, Defs, Line, LinearGradient as SvgLinearGradient, Polyline, Rect, Stop, Text as SvgText, G } from 'react-native-svg';

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

import type { SessionResult } from '@/providers/tradnex-provider';
import { generateText } from '@rork-ai/toolkit-sdk';

const SESSION_RESULT_OPTIONS: { value: SessionResult; label: string; color: string; icon: 'up' | 'down' | 'neutral' }[] = [
  { value: 'profitable', label: 'Profitable', color: '#00C48C', icon: 'up' },
  { value: 'neutral', label: 'Neutre', color: '#8F97A8', icon: 'neutral' },
  { value: 'loss', label: 'Perte', color: '#FF3B30', icon: 'down' },
];

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
        zones.push({ x: p.x, y: CHART_PADDING, width: segWidth, height: CHART_INNER_HEIGHT, opacity: intensity * 0.22 });
      }
    }
    return zones;
  }, [points]);

  const sessionArrows = useMemo(() => {
    return resolvedSessions.map((session) => {
      let startRatio = normalizeHour(session.startHour);
      let endRatio = normalizeHour(session.endHour);
      if (endRatio < startRatio) endRatio = normalizeHour(session.endHour + 24);
      startRatio = Math.max(0, Math.min(1, startRatio));
      endRatio = Math.max(0, Math.min(1, endRatio));
      const x1 = CHART_LEFT_PADDING + startRatio * CHART_INNER_WIDTH;
      const x2 = CHART_LEFT_PADDING + endRatio * CHART_INNER_WIDTH;
      return {
        id: session.id, label: session.label, labelColor: session.labelColor,
        x: x1, width: x2 - x1,
        startLabel: formatHourLabel(session.startHour), endLabel: formatHourLabel(session.endHour),
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
        <Rect x={CHART_LEFT_PADDING} y={CHART_PADDING} width={CHART_INNER_WIDTH} height={CHART_INNER_HEIGHT} rx={6} fill="rgba(255,255,255,0.02)" />
        {stressZones.map((zone, i) => (
          <Rect key={`stress-zone-${i}`} x={zone.x} y={zone.y} width={zone.width} height={zone.height} fill="#FF3B30" opacity={zone.opacity} />
        ))}
        <Rect x={CHART_LEFT_PADDING} y={CHART_PADDING} width={CHART_INNER_WIDTH} height={CHART_INNER_HEIGHT * 0.3} fill="url(#stressRedGrad)" opacity={0.5} />
        {yAxisTicks.map((tick) => {
          const y = CHART_PADDING + (1 - tick / 100) * CHART_INNER_HEIGHT;
          return (
            <React.Fragment key={`ytick-${tick}`}>
              <Line x1={CHART_LEFT_PADDING} y1={y} x2={CHART_WIDTH - CHART_PADDING} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="3,3" />
              <SvgText x={CHART_LEFT_PADDING - 6} y={y + 4} fill="rgba(255,255,255,0.3)" fontSize="9" textAnchor="end">{tick}</SvgText>
            </React.Fragment>
          );
        })}
        {polylineStr ? (
          <Polyline points={polylineStr} fill="none" stroke="url(#lineGrad)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        ) : null}
        {points.map((p, i) => {
          if (p.stress < 70) return null;
          return <Rect key={`high-stress-${i}`} x={p.x - 1.5} y={p.y} width={3} height={CHART_PADDING + CHART_INNER_HEIGHT - p.y} fill="#FF3B30" opacity={0.1} />;
        })}
        {sessionArrows.map((arrow) => {
          const midY = SESSION_BAR_Y + SESSION_BAR_HEIGHT / 2;
          const arrowTipSize = 3;
          return (
            <G key={`session-arrow-${arrow.id}`}>
              <Line x1={arrow.x} y1={CHART_PADDING} x2={arrow.x} y2={CHART_PADDING + CHART_INNER_HEIGHT} stroke={arrow.labelColor} strokeWidth="0.7" strokeDasharray="3,4" opacity={0.25} />
              <Line x1={arrow.x + arrow.width} y1={CHART_PADDING} x2={arrow.x + arrow.width} y2={CHART_PADDING + CHART_INNER_HEIGHT} stroke={arrow.labelColor} strokeWidth="0.7" strokeDasharray="3,4" opacity={0.25} />
              <Line x1={arrow.x} y1={midY} x2={arrow.x + arrow.width} y2={midY} stroke={arrow.labelColor} strokeWidth="2" strokeLinecap="round" />
              <Line x1={arrow.x} y1={midY - arrowTipSize} x2={arrow.x} y2={midY + arrowTipSize} stroke={arrow.labelColor} strokeWidth="2" strokeLinecap="round" />
              <Line x1={arrow.x + arrow.width} y1={midY - arrowTipSize} x2={arrow.x + arrow.width} y2={midY + arrowTipSize} stroke={arrow.labelColor} strokeWidth="2" strokeLinecap="round" />
              <SvgText x={arrow.x + arrow.width / 2} y={midY - 7} fill={arrow.labelColor} fontSize="8" textAnchor="middle" fontWeight="600">{arrow.label}</SvgText>
            </G>
          );
        })}
      </Svg>
      <View style={chartStyles.hoursRow}>
        {hourLabels.map((h, i) => (
          <Text key={`${h.hour}-${i}`} style={chartStyles.hourLabel}>{Math.floor(h.displayHour).toString().padStart(2, '0')}h</Text>
        ))}
      </View>
      {resolvedSessions.length > 0 ? (
        <View style={chartStyles.sessionLegend}>
          {resolvedSessions.map((s) => (
            <View key={s.id} style={chartStyles.legendItem}>
              <View style={[chartStyles.legendDot, { backgroundColor: s.labelColor }]} />
              <Text style={chartStyles.legendText}>{s.label} {formatHourLabel(s.startHour)}{'\u2013'}{formatHourLabel(s.endHour)}</Text>
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
    const stressTrend = history.length >= 3 ? history[history.length - 1].stress - history[0].stress : 0;

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
        <View style={aiStyles.iconWrap}><BrainCircuit color={tradnexTheme.accent} size={16} /></View>
        <Text style={aiStyles.title}>Analyse IA</Text>
        <View style={aiStyles.rangeBadge}><Text style={aiStyles.rangeBadgeText}>{range === '7d' ? '7j' : '30j'}</Text></View>
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
  if (avgStress > 65) parts.push(`Votre stress moyen ${period} est \u00e9lev\u00e9 (${avgStress}/100). Restez attentif \u00e0 vos signaux corporels.`);
  else if (avgStress > 45) parts.push(`Stress mod\u00e9r\u00e9 ${period} (${avgStress}/100). Vos niveaux restent dans une zone g\u00e9rable.`);
  else parts.push(`Excellent contr\u00f4le du stress ${period} (${avgStress}/100). Vos conditions sont favorables.`);
  if (avgSleep < 6.5) parts.push(`Sommeil moyen de ${avgSleep}h : un d\u00e9ficit qui peut affecter vos d\u00e9cisions. Visez 7h minimum.`);
  else if (avgSleep < 7.5) parts.push(`Sommeil correct (${avgSleep}h en moyenne). Une l\u00e9g\u00e8re am\u00e9lioration serait b\u00e9n\u00e9fique.`);
  else parts.push(`Bon sommeil (${avgSleep}h). Votre r\u00e9cup\u00e9ration soutient bien vos performances.`);
  if (avgHrv < 45) parts.push('Privil\u00e9giez des pauses r\u00e9guli\u00e8res pour favoriser la r\u00e9cup\u00e9ration.');
  else parts.push('Maintenez cette r\u00e9gularit\u00e9 pour rester performant.');
  return parts.join(' ');
}

function formatHourLabel(hour: number): string {
  const h = Math.floor(((hour % 24) + 24) % 24);
  const m = Math.round((hour - Math.floor(hour)) * 60);
  if (m === 0) return `${h.toString().padStart(2, '0')}h`;
  return `${h.toString().padStart(2, '0')}h${m.toString().padStart(2, '0')}`;
}

function getDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface MonthCalendarProps {
  days: DayDetail[];
  sessionLogs: { date: string; result: SessionResult; score: number; note?: string }[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

function MonthCalendar({ days, sessionLogs, selectedIndex, onSelect }: MonthCalendarProps) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const [viewMonth, setViewMonth] = useState<number>(today.getMonth());
  const [viewYear, setViewYear] = useState<number>(today.getFullYear());

  const dayMap = useMemo(() => {
    const map = new Map<string, { index: number; day: DayDetail }>();
    days.forEach((day, index) => { map.set(getDateKey(day.date), { index, day }); });
    return map;
  }, [days]);

  const logMap = useMemo(() => {
    const map = new Map<string, SessionResult>();
    sessionLogs.forEach(log => { map.set(log.date, log.result); });
    return map;
  }, [sessionLogs]);

  const cells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    let startDow = firstDay.getDay();
    if (startDow === 0) startDow = 6; else startDow--;

    const result: Array<{ date: Date | null; dayNum: number; dateKey: string }> = [];
    for (let i = 0; i < startDow; i++) result.push({ date: null, dayNum: 0, dateKey: '' });
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(viewYear, viewMonth, d);
      date.setHours(0, 0, 0, 0);
      result.push({ date, dayNum: d, dateKey: getDateKey(date) });
    }
    return result;
  }, [viewMonth, viewYear]);

  const monthLabel = useMemo(() => {
    const d = new Date(viewYear, viewMonth, 1);
    return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }, [viewMonth, viewYear]);

  const canGoForward = viewYear < today.getFullYear() || (viewYear === today.getFullYear() && viewMonth < today.getMonth());

  const goBack = useCallback(() => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }, [viewMonth]);

  const goForward = useCallback(() => {
    if (!canGoForward) return;
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }, [viewMonth, canGoForward]);

  const weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  return (
    <View style={calStyles.wrapper}>
      <View style={calStyles.navRow}>
        <Pressable onPress={goBack} hitSlop={12} testID="cal-prev"><ChevronLeft color={tradnexTheme.textSecondary} size={22} /></Pressable>
        <Text style={calStyles.rangeLabel}>{monthLabel}</Text>
        <Pressable onPress={goForward} hitSlop={12} testID="cal-next" style={{ opacity: canGoForward ? 1 : 0.25 }}><ChevronRight color={tradnexTheme.textSecondary} size={22} /></Pressable>
      </View>
      <View style={calStyles.weekRow}>
        {weekDays.map((label, i) => (<View key={i} style={calStyles.weekCell}><Text style={calStyles.weekText}>{label}</Text></View>))}
      </View>
      <View style={calStyles.monthGrid}>
        {cells.map((cell, ci) => {
          if (!cell.date) return <View key={`empty-${ci}`} style={calStyles.cell} />;
          const isFuture = cell.date.getTime() > today.getTime();
          const isToday = cell.date.getTime() === today.getTime();
          const entry = dayMap.get(cell.dateKey);
          const hasData = !!entry && !isFuture;
          const isSelected = hasData && entry.index === selectedIndex;
          const sessionResult = logMap.get(cell.dateKey);

          let dotColor: string | null = null;
          if (sessionResult === 'profitable') dotColor = '#00C48C';
          else if (sessionResult === 'loss') dotColor = '#FF3B30';
          else if (sessionResult === 'neutral') dotColor = '#8F97A8';
          else if (hasData) dotColor = tradnexTheme.accent;

          return (
            <Pressable
              key={`day-${cell.dateKey}`}
              style={[calStyles.cell, isSelected && calStyles.cellSelected, isFuture && calStyles.cellFuture]}
              onPress={() => { if (hasData && entry) onSelect(entry.index); }}
              disabled={isFuture || !hasData}
              testID={`cal-day-${cell.dayNum}`}
            >
              <Text style={[
                calStyles.dayNum,
                !hasData && !isFuture && calStyles.dayNumNoData,
                isSelected && calStyles.dayNumSelected,
                isToday && !isSelected && calStyles.dayNumToday,
                isFuture && calStyles.dayNumFuture,
              ]}>{cell.dayNum}</Text>
              {dotColor ? (
                <View style={[calStyles.resultDot, { backgroundColor: dotColor }, sessionResult ? calStyles.resultDotLarge : null]} />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

interface CorrelationChartProps {
  sessionLogs: { date: string; result: SessionResult; score: number }[];
}

function CorrelationChart({ sessionLogs }: CorrelationChartProps) {
  const width = 320;
  const height = 180;
  const padL = 38;
  const padR = 14;
  const padT = 14;
  const padB = 24;
  const cW = width - padL - padR;
  const cH = height - padT - padB;

  const resultToY = useCallback((r: SessionResult) => {
    if (r === 'loss') return 0;
    if (r === 'neutral') return 1;
    return 2;
  }, []);

  const points = useMemo(() => {
    return sessionLogs.map(log => {
      const x = padL + (log.score / 100) * cW;
      const yVal = resultToY(log.result);
      const y = padT + (1 - yVal / 2) * cH;
      return { x, y, result: log.result, score: log.score };
    });
  }, [sessionLogs, cW, cH, resultToY]);

  const trendLine = useMemo(() => {
    if (points.length < 3) return null;
    const n = sessionLogs.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    sessionLogs.forEach(log => {
      const x = log.score;
      const y = resultToY(log.result);
      sumX += x; sumY += y; sumXY += x * y; sumX2 += x * x;
    });
    const denom = n * sumX2 - sumX * sumX;
    if (denom === 0) return null;
    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    const x1 = 0; const x2 = 100;
    const y1 = slope * x1 + intercept;
    const y2 = slope * x2 + intercept;
    return {
      x1: padL + (x1 / 100) * cW,
      y1: padT + (1 - Math.max(0, Math.min(2, y1)) / 2) * cH,
      x2: padL + (x2 / 100) * cW,
      y2: padT + (1 - Math.max(0, Math.min(2, y2)) / 2) * cH,
    };
  }, [sessionLogs, points, resultToY, cW, cH]);

  const yLabels = ['Perte', 'Neutre', 'Profit'];

  return (
    <View style={corrStyles.card}>
      <Text style={corrStyles.title}>Corr{'\u00e9'}lation score / performance</Text>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {[0, 1, 2].map(i => {
          const y = padT + (1 - i / 2) * cH;
          return (
            <React.Fragment key={`ygrid-${i}`}>
              <Line x1={padL} y1={y} x2={width - padR} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
              <SvgText x={padL - 6} y={y + 4} fill="rgba(255,255,255,0.35)" fontSize="9" textAnchor="end">{yLabels[i]}</SvgText>
            </React.Fragment>
          );
        })}
        {[0, 25, 50, 75, 100].map(tick => {
          const x = padL + (tick / 100) * cW;
          return <SvgText key={`xtick-${tick}`} x={x} y={height - 6} fill="rgba(255,255,255,0.3)" fontSize="9" textAnchor="middle">{tick}</SvgText>;
        })}
        {trendLine ? (
          <Line x1={trendLine.x1} y1={trendLine.y1} x2={trendLine.x2} y2={trendLine.y2} stroke={tradnexTheme.accent} strokeWidth="1.5" strokeDasharray="4,4" opacity={0.5} />
        ) : null}
        {points.map((p, i) => {
          const fillColor = p.result === 'profitable' ? '#00C48C' : p.result === 'loss' ? '#FF3B30' : '#8F97A8';
          return <SvgCircle key={`pt-${i}`} cx={p.x} cy={p.y} r={5} fill={fillColor} opacity={0.85} />;
        })}
      </Svg>
    </View>
  );
}

function CorrelationPlaceholder({ count }: { count: number }) {
  const ratio = Math.min(count / 5, 1);
  return (
    <View style={corrStyles.placeholder}>
      <Text style={corrStyles.placeholderTitle}>Corr{'\u00e9'}lation score / performance</Text>
      <Text style={corrStyles.placeholderSubtitle}>Loggez 5 sessions pour d{'\u00e9'}bloquer votre graphique de corr{'\u00e9'}lation</Text>
      <View style={corrStyles.progressBar}>
        <View style={[corrStyles.progressFill, { width: `${ratio * 100}%` }]} />
      </View>
      <Text style={corrStyles.progressText}>{count}/5</Text>
    </View>
  );
}

interface LoggingModalProps {
  visible: boolean;
  onClose: () => void;
  onLog: (result: SessionResult, note: string) => void;
  existingResult: SessionResult | null;
  tradnexScore: number;
}

function LoggingModal({ visible, onClose, onLog, existingResult, tradnexScore }: LoggingModalProps) {
  const [note, setNote] = useState<string>('');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={logStyles.overlay}>
        <View style={logStyles.content}>
          <View style={logStyles.header}>
            <Text style={logStyles.title}>{existingResult ? 'Modifier ma session' : 'Comment s\u2019est pass\u00e9e votre session ?'}</Text>
            <Pressable onPress={onClose} hitSlop={12}><X color={tradnexTheme.textPrimary} size={22} /></Pressable>
          </View>
          <View style={logStyles.scoreRow}>
            <Text style={logStyles.scoreLabel}>Tradnex Score ce matin</Text>
            <Text style={logStyles.scoreValue}>{tradnexScore}/100</Text>
          </View>
          <View style={logStyles.buttonsRow}>
            {SESSION_RESULT_OPTIONS.map(opt => (
              <Pressable
                key={opt.value}
                style={[logStyles.resultBtn, { borderColor: opt.color + '50' }]}
                onPress={() => { onLog(opt.value, note); onClose(); }}
                testID={`log-modal-${opt.value}`}
              >
                {opt.icon === 'up' ? <TrendingUp color={opt.color} size={22} /> : opt.icon === 'down' ? <TrendingDown color={opt.color} size={22} /> : <Activity color={opt.color} size={22} />}
                <Text style={[logStyles.resultText, { color: opt.color }]}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            style={logStyles.noteInput}
            placeholder="Note rapide (optionnel)..."
            placeholderTextColor={tradnexTheme.textMuted}
            value={note}
            onChangeText={setNote}
            maxLength={120}
            multiline
            testID="log-note-input"
          />
        </View>
      </View>
    </Modal>
  );
}

export default function HistoryScreen() {
  const [windowRange, setWindowRange] = useState<'7d' | '30d'>('7d');
  const [infoVisible, setInfoVisible] = useState<boolean>(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [logModalVisible, setLogModalVisible] = useState<boolean>(false);
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
    tradnexScore,
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

  const handleSelectDay = useCallback((index: number) => { setSelectedDayIndex(index); }, []);

  const selectedHistory = useMemo(() => windowRange === '7d' ? sevenDayHistory : thirtyDayHistory, [sevenDayHistory, thirtyDayHistory, windowRange]);

  const todayKey = useMemo(() => { const d = new Date(); return getDateKey(d); }, []);
  const todayLog = useMemo(() => sessionLogs.find(l => l.date === todayKey) ?? null, [sessionLogs, todayKey]);

  const handleLogToday = useCallback((result: SessionResult, note: string) => {
    const score = tradnexScore?.total ?? 0;
    logSessionResult(todayKey, result, score, note || undefined);
  }, [tradnexScore, logSessionResult, todayKey]);

  const selectedDayLog = useMemo(() => {
    if (!selectedDay) return null;
    const key = getDateKey(selectedDay.date);
    return sessionLogs.find(l => l.date === key) ?? null;
  }, [selectedDay, sessionLogs]);

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
            <View style={styles.loadingCard}><Text style={styles.loadingTitle}>Chargement</Text></View>
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

              {selectedDayLog ? (
                <View style={sessionStyles.loggedRow}>
                  <View style={[sessionStyles.loggedPill, { backgroundColor: (SESSION_RESULT_OPTIONS.find(o => o.value === selectedDayLog.result)?.color ?? '#8F97A8') + '18' }]}>
                    {selectedDayLog.result === 'profitable' ? <TrendingUp color="#00C48C" size={14} /> : selectedDayLog.result === 'loss' ? <TrendingDown color="#FF3B30" size={14} /> : <Activity color="#8F97A8" size={14} />}
                    <Text style={[sessionStyles.loggedText, { color: SESSION_RESULT_OPTIONS.find(o => o.value === selectedDayLog.result)?.color ?? '#8F97A8' }]}>
                      {SESSION_RESULT_OPTIONS.find(o => o.value === selectedDayLog.result)?.label}
                    </Text>
                    <Text style={sessionStyles.loggedScore}>Score {selectedDayLog.score}</Text>
                  </View>
                  <Pressable onPress={() => removeSessionResult(getDateKey(selectedDay!.date))} hitSlop={8} testID="remove-session-log">
                    <X color={tradnexTheme.textMuted} size={16} />
                  </Pressable>
                </View>
              ) : selectedDay && !isFutureDate(selectedDay.date) ? (
                <View style={sessionStyles.container}>
                  <Text style={sessionStyles.question}>R{'\u00e9'}sultat de votre session ?</Text>
                  <View style={sessionStyles.optionsRow}>
                    {SESSION_RESULT_OPTIONS.map((opt) => (
                      <Pressable
                        key={opt.value}
                        style={[sessionStyles.optionBtn, { borderColor: opt.color + '35' }]}
                        onPress={() => logSessionResult(getDateKey(selectedDay.date), opt.value, selectedDay.avgStress)}
                        testID={`log-session-${opt.value}`}
                      >
                        {opt.icon === 'up' ? <TrendingUp color={opt.color} size={16} /> : opt.icon === 'down' ? <TrendingDown color={opt.color} size={16} /> : <Activity color={opt.color} size={16} />}
                        <Text style={[sessionStyles.optionText, { color: opt.color }]}>{opt.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}

              <MonthCalendar
                days={dayDetails}
                sessionLogs={sessionLogs}
                selectedIndex={selectedDayIndex}
                onSelect={handleSelectDay}
              />

              {sessionLogs.length >= 5 ? (
                <CorrelationChart sessionLogs={sessionLogs} />
              ) : (
                <CorrelationPlaceholder count={sessionLogs.length} />
              )}

              {personalPatterns && personalPatterns.totalSessions >= 5 ? (
                <View style={patternStyles.container}>
                  <View style={patternStyles.header}>
                    <BrainCircuit color={tradnexTheme.accent} size={16} />
                    <Text style={patternStyles.title}>Patterns personnels</Text>
                    <View style={patternStyles.badge}><Text style={patternStyles.badgeText}>{personalPatterns.totalSessions} sessions</Text></View>
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
                </View>
              ) : null}

              <View style={styles.sectionDivider} />
              <View style={styles.trendHeader}><Text style={styles.trendTitle}>Tendances</Text></View>

              <Modal visible={infoVisible} transparent animationType="fade" onRequestClose={() => setInfoVisible(false)}>
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Comprendre vos donn{'\u00e9'}es</Text>
                      <Pressable onPress={() => setInfoVisible(false)} hitSlop={12}><X color={tradnexTheme.textPrimary} size={22} /></Pressable>
                    </View>
                    <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                      <Text style={styles.modalSectionTitle}>Score de stress (0{'\u2013'}100)</Text>
                      <Text style={styles.modalText}>Calcul{'\u00e9'} {'\u00e0'} partir de votre variabilit{'\u00e9'} cardiaque (HRV). Plus le score est bas, plus vous {'\u00ea'}tes d{'\u00e9'}tendu.</Text>
                      <View style={styles.modalScale}>
                        <View style={styles.modalScaleRow}><View style={[styles.modalDot, { backgroundColor: tradnexTheme.success }]} /><Text style={styles.modalText}>0{'\u2013'}39 : Optimal</Text></View>
                        <View style={styles.modalScaleRow}><View style={[styles.modalDot, { backgroundColor: tradnexTheme.warning }]} /><Text style={styles.modalText}>40{'\u2013'}69 : Mod{'\u00e9'}r{'\u00e9'}</Text></View>
                        <View style={styles.modalScaleRow}><View style={[styles.modalDot, { backgroundColor: tradnexTheme.danger }]} /><Text style={styles.modalText}>70{'\u2013'}100 : {'\u00c9'}lev{'\u00e9'}</Text></View>
                      </View>
                      <Text style={styles.modalSectionTitle}>Sommeil (heures)</Text>
                      <Text style={styles.modalText}>Dur{'\u00e9'}e totale de sommeil d{'\u00e9'}tect{'\u00e9'}e. Visez entre 7h et 9h.</Text>
                      <Text style={styles.modalSectionTitle}>HRV</Text>
                      <Text style={styles.modalText}>Mesur{'\u00e9'}e en ms. Un HRV {'\u00e9'}lev{'\u00e9'} indique une bonne r{'\u00e9'}cup{'\u00e9'}ration.</Text>
                      <Text style={styles.modalSectionTitle}>Fr{'\u00e9'}quence cardiaque (BPM)</Text>
                      <Text style={styles.modalText}>Votre pouls au repos. Un BPM bas (50{'\u2013'}70) est signe de bonne condition.</Text>
                    </ScrollView>
                  </View>
                </View>
              </Modal>

              <SegmentedControl
                options={[{ label: '7 jours', value: '7d' }, { label: '30 jours', value: '30d' }]}
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
                  <Text style={styles.statLabel}>R{'\u00e9'}cup{'\u00e9'}ration</Text>
                </View>
              </View>

              <AiTrendAnalysis history={selectedHistory} range={windowRange} />

              <TrendChart title="Stress" subtitle="" color={tradnexTheme.accent}
                data={selectedHistory.map((item, i) => { const d = new Date(); d.setDate(d.getDate() - (selectedHistory.length - 1 - i)); return { label: item.dateLabel, value: item.stress, dayOfWeek: d.getDay() }; })}
                variant="line" testID="stress-trend-chart" />
              <TrendChart title="Sommeil" subtitle="" color={tradnexTheme.success}
                data={selectedHistory.map((item, i) => { const d = new Date(); d.setDate(d.getDate() - (selectedHistory.length - 1 - i)); return { label: item.dateLabel, value: item.sleepHours, dayOfWeek: d.getDay() }; })}
                variant="bar" testID="sleep-trend-chart" />
              <TrendChart title="HRV" subtitle="" color={tradnexTheme.warning}
                data={selectedHistory.map((item, i) => { const d = new Date(); d.setDate(d.getDate() - (selectedHistory.length - 1 - i)); return { label: item.dateLabel, value: item.hrv, dayOfWeek: d.getDay() }; })}
                variant="line" testID="hrv-trend-chart" />
            </Animated.View>
          </ScrollView>

          <Pressable
            style={styles.fab}
            onPress={() => setLogModalVisible(true)}
            testID="fab-log-session"
          >
            {todayLog ? <Text style={styles.fabEditText}>{'\u270f\ufe0f'}</Text> : <Plus color={tradnexTheme.white} size={24} />}
          </Pressable>

          <LoggingModal
            visible={logModalVisible}
            onClose={() => setLogModalVisible(false)}
            onLog={handleLogToday}
            existingResult={todayLog?.result ?? null}
            tradnexScore={tradnexScore?.total ?? 0}
          />
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

function isFutureDate(d: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const check = new Date(d);
  check.setHours(0, 0, 0, 0);
  return check.getTime() > today.getTime();
}

const calStyles = StyleSheet.create({
  wrapper: { gap: 8 },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 4 },
  rangeLabel: { color: tradnexTheme.textPrimary, fontSize: 15, fontWeight: '700' as const, textTransform: 'capitalize' as const },
  weekRow: { flexDirection: 'row' },
  weekCell: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  weekText: { color: tradnexTheme.textMuted, fontSize: 12, fontWeight: '600' as const },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%' as unknown as number, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  cellSelected: { backgroundColor: 'rgba(10,132,255,0.18)', borderRadius: 10 },
  cellFuture: { opacity: 0.2 },
  dayNum: { color: tradnexTheme.textPrimary, fontSize: 14, fontWeight: '600' as const },
  dayNumNoData: { color: tradnexTheme.textMuted, opacity: 0.4 },
  dayNumSelected: { color: tradnexTheme.accent, fontWeight: '800' as const },
  dayNumToday: { color: tradnexTheme.accent },
  dayNumFuture: { color: tradnexTheme.textMuted, opacity: 0.3 },
  resultDot: { width: 6, height: 6, borderRadius: 3 },
  resultDotLarge: { width: 8, height: 8, borderRadius: 4 },
});

const aiStyles = StyleSheet.create({
  container: { borderRadius: 20, backgroundColor: 'rgba(10,132,255,0.06)', borderWidth: 1, borderColor: 'rgba(10,132,255,0.15)', padding: 16, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconWrap: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(10,132,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  title: { color: tradnexTheme.textPrimary, fontSize: 15, fontWeight: '700' as const, flex: 1 },
  rangeBadge: { borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 8, paddingVertical: 3 },
  rangeBadgeText: { color: tradnexTheme.textMuted, fontSize: 11, fontWeight: '600' as const },
  loadingWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  loadingText: { color: tradnexTheme.textMuted, fontSize: 13 },
  analysisText: { color: tradnexTheme.textSecondary, fontSize: 13, lineHeight: 20 },
});

const chartStyles = StyleSheet.create({
  container: { gap: 6 },
  sessionLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: tradnexTheme.textMuted, fontSize: 10 },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  hourLabel: { color: tradnexTheme.textMuted, fontSize: 10 },
});

const corrStyles = StyleSheet.create({
  card: { borderRadius: 22, backgroundColor: tradnexTheme.surface, borderWidth: 1, borderColor: tradnexTheme.border, padding: 18, gap: 12 },
  title: { color: tradnexTheme.textPrimary, fontSize: 16, fontWeight: '700' as const },
  placeholder: { borderRadius: 22, backgroundColor: tradnexTheme.surface, borderWidth: 1, borderColor: 'rgba(10,132,255,0.15)', padding: 20, gap: 12, alignItems: 'center' },
  placeholderTitle: { color: tradnexTheme.textPrimary, fontSize: 15, fontWeight: '700' as const, textAlign: 'center' as const },
  placeholderSubtitle: { color: tradnexTheme.textSecondary, fontSize: 13, lineHeight: 19, textAlign: 'center' as const },
  progressBar: { width: '80%', height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' as const },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: tradnexTheme.accent },
  progressText: { color: tradnexTheme.textMuted, fontSize: 12, fontWeight: '600' as const },
});

const sessionStyles = StyleSheet.create({
  container: { gap: 10 },
  question: { color: tradnexTheme.textSecondary, fontSize: 13, fontWeight: '600' as const },
  optionsRow: { flexDirection: 'row', gap: 8 },
  optionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1 },
  optionText: { fontSize: 13, fontWeight: '700' as const },
  loggedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  loggedPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  loggedText: { fontSize: 13, fontWeight: '700' as const },
  loggedScore: { color: tradnexTheme.textMuted, fontSize: 12 },
});

const logStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  content: { backgroundColor: tradnexTheme.surfaceElevated, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: tradnexTheme.textPrimary, fontSize: 20, fontWeight: '800' as const, flex: 1 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(10,132,255,0.08)', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  scoreLabel: { color: tradnexTheme.textSecondary, fontSize: 14 },
  scoreValue: { color: tradnexTheme.accent, fontSize: 18, fontWeight: '800' as const },
  buttonsRow: { gap: 10 },
  resultBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1 },
  resultText: { fontSize: 17, fontWeight: '700' as const },
  noteInput: { color: tradnexTheme.textPrimary, fontSize: 14, lineHeight: 20, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, minHeight: 52, textAlignVertical: 'top' as const },
});

const patternStyles = StyleSheet.create({
  container: { borderRadius: 22, backgroundColor: 'rgba(10,132,255,0.06)', borderWidth: 1, borderColor: 'rgba(10,132,255,0.15)', padding: 16, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: tradnexTheme.textPrimary, fontSize: 15, fontWeight: '700' as const, flex: 1 },
  badge: { borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: tradnexTheme.textMuted, fontSize: 11, fontWeight: '600' as const },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { color: tradnexTheme.textPrimary, fontSize: 20, fontWeight: '800' as const },
  statLabel: { color: tradnexTheme.textMuted, fontSize: 11 },
  statDivider: { width: 1, height: 24, backgroundColor: tradnexTheme.border },
});

const styles = StyleSheet.create({
  selectedDayCard: { borderRadius: 26, backgroundColor: 'rgba(10,132,255,0.06)', borderWidth: 1, borderColor: 'rgba(10,132,255,0.15)', padding: 14, paddingHorizontal: 10, gap: 16 },
  selectedDayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
  selectedDayHeaderLeft: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  selectedDayLabel: { color: tradnexTheme.textPrimary, fontSize: 20, fontWeight: '800' as const },
  selectedDateLabel: { color: tradnexTheme.textSecondary, fontSize: 14 },
  miniStatsRow: { flexDirection: 'row', alignItems: 'center', gap: 0, paddingHorizontal: 8 },
  miniStat: { flex: 1, alignItems: 'center', gap: 4 },
  miniStatValueSm: { color: tradnexTheme.textPrimary, fontSize: 18, fontWeight: '700' as const },
  miniStatLabel: { color: tradnexTheme.textMuted, fontSize: 11 },
  miniStatDivider: { width: 1, height: 28, backgroundColor: tradnexTheme.border },
  sectionDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 8 },
  trendHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 },
  trendTitle: { color: tradnexTheme.textPrimary, fontSize: 22, fontWeight: '800' as const },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, borderRadius: 22, backgroundColor: tradnexTheme.surface, borderWidth: 1, borderColor: tradnexTheme.border, padding: 16, gap: 10 },
  statValue: { color: tradnexTheme.textPrimary, fontSize: 22, fontWeight: '700' as const },
  statLabel: { color: tradnexTheme.textMuted, fontSize: 12 },
  hrvChip: { alignSelf: 'flex-start', color: tradnexTheme.warning, backgroundColor: 'rgba(255,149,0,0.12)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, overflow: 'hidden', fontSize: 12, fontWeight: '700' as const },
  background: { flex: 1, backgroundColor: '#000000' },
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 120 },
  inner: { gap: 18 },
  loadingCard: { borderRadius: 24, backgroundColor: tradnexTheme.surface, borderWidth: 1, borderColor: tradnexTheme.border, padding: 24 },
  loadingTitle: { color: tradnexTheme.textPrimary, fontSize: 22, fontWeight: '800' as const },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { backgroundColor: tradnexTheme.surfaceElevated, borderRadius: 24, borderWidth: 1, borderColor: tradnexTheme.border, padding: 22, maxHeight: '80%', width: '100%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { color: tradnexTheme.textPrimary, fontSize: 20, fontWeight: '800' as const },
  modalScroll: { flexGrow: 0 },
  modalSectionTitle: { color: tradnexTheme.accent, fontSize: 15, fontWeight: '700' as const, marginTop: 16, marginBottom: 6 },
  modalText: { color: tradnexTheme.textSecondary, fontSize: 14, lineHeight: 20, flex: 1 },
  modalScale: { gap: 8, marginTop: 8 },
  modalScaleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalDot: { width: 10, height: 10, borderRadius: 5 },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: tradnexTheme.accent, alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: tradnexTheme.accent, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  fabEditText: { fontSize: 20 },
});
