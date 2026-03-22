import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import { Activity, ArrowDown, ArrowUp, BarChart3, BrainCircuit, ChevronLeft, ChevronRight, Clock, Info, Maximize2, Minimize2, MoonStar, X } from 'lucide-react-native';
import { ActivityIndicator, Animated, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, Line, LinearGradient as SvgLinearGradient, Rect, Stop, Text as SvgText, G } from 'react-native-svg';

import { SegmentedControl } from '@/components/segmented-control';
import { TrendChart } from '@/components/trend-chart';
import { tradnexTheme } from '@/constants/tradnex-theme';
import {
  TradingSessionId,
  getSessionTimesForDate,
} from '@/constants/trading-sessions';
import { useTradnex } from '@/providers/tradnex-provider';
import { DayDetail, HourlyStressPoint } from '@/mocks/hourly';
import { HealthDay } from '@/mocks/health';
import { getStressColor } from '@/utils/tradnex';
import { generateText } from '@rork-ai/toolkit-sdk';

const CHART_WIDTH = 340;
const CHART_HEIGHT = 220;
const CHART_LEFT_PAD = 32;
const CHART_RIGHT_PAD = 10;
const CHART_TOP_PAD = 10;
const CHART_BOTTOM_PAD = 22;
const CHART_INNER_W = CHART_WIDTH - CHART_LEFT_PAD - CHART_RIGHT_PAD;
const CHART_INNER_H = CHART_HEIGHT - CHART_TOP_PAD - CHART_BOTTOM_PAD;

const BAR_COLOR_LOW = '#00C48C';
const BAR_COLOR_MID = '#FF9500';
const BAR_COLOR_HIGH = '#FF3B30';

function getBarColor(stress: number): string {
  if (stress <= 33) return BAR_COLOR_LOW;
  if (stress <= 66) return BAR_COLOR_MID;
  return BAR_COLOR_HIGH;
}

function getStressLabel(stress: number): { text: string; color: string; bg: string } {
  if (stress <= 33) return { text: 'Low Stress', color: '#00C48C', bg: 'rgba(0,196,140,0.18)' };
  if (stress <= 66) return { text: 'Moderate Stress', color: '#FF9500', bg: 'rgba(255,149,0,0.18)' };
  return { text: 'High Stress', color: '#FF3B30', bg: 'rgba(255,59,48,0.18)' };
}

const SESSION_ZONE_COLORS: Record<string, string> = {
  tokyo: 'rgba(10,132,255,0.08)',
  london: 'rgba(175,82,222,0.08)',
  newyork: 'rgba(255,149,0,0.08)',
};

const SESSION_ZONE_LABEL_COLORS: Record<string, string> = {
  tokyo: 'rgba(10,132,255,0.5)',
  london: 'rgba(175,82,222,0.5)',
  newyork: 'rgba(255,149,0,0.5)',
};

const SESSION_SHORT_LABELS: Record<string, string> = {
  tokyo: 'Asie',
  london: 'Londres',
  newyork: 'NY',
};

interface HourlyChartProps {
  hourlyData: HourlyStressPoint[];
  selectedSessions: TradingSessionId[];
  selectedDate: Date;
  userTimezone?: string;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;

function interpolateStress(hourlyData: HourlyStressPoint[], fractionalHour: number): number {
  if (hourlyData.length === 0) return 0;
  const clamped = Math.max(0, Math.min(23.99, fractionalHour));
  const lowIdx = hourlyData.findIndex((p) => p.hour === Math.floor(clamped));
  const highIdx = hourlyData.findIndex((p) => p.hour === Math.ceil(clamped));
  if (lowIdx === -1) return hourlyData[0]?.stress ?? 0;
  if (highIdx === -1 || lowIdx === highIdx) return hourlyData[lowIdx].stress;
  const frac = clamped - Math.floor(clamped);
  return Math.round(hourlyData[lowIdx].stress * (1 - frac) + hourlyData[highIdx].stress * frac);
}

function getZoomInterval(zoom: number): number {
  if (zoom >= 6) return 1 / 12;
  if (zoom >= 4) return 1 / 6;
  if (zoom >= 2.5) return 0.25;
  if (zoom >= 1.5) return 0.5;
  return 1;
}

function getXTicksForZoom(startH: number, endH: number, zoom: number): { hour: number; label: string }[] {
  const ticks: { hour: number; label: string }[] = [];

  let step: number;
  let formatFn: (h: number) => string;

  if (zoom >= 6) {
    step = 0.5;
    formatFn = (h) => {
      const hh = Math.floor(h);
      const mm = Math.round((h - hh) * 60);
      return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
    };
  } else if (zoom >= 4) {
    step = 0.5;
    formatFn = (h) => {
      const hh = Math.floor(h);
      const mm = Math.round((h - hh) * 60);
      return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
    };
  } else if (zoom >= 2.5) {
    step = 1;
    formatFn = (h) => `${Math.floor(h)}h`;
  } else if (zoom >= 1.5) {
    step = 2;
    formatFn = (h) => `${Math.floor(h)}h`;
  } else {
    step = 4;
    formatFn = (h) => `${Math.floor(h)}h`;
  }

  const first = Math.ceil(startH / step) * step;
  for (let h = first; h <= endH; h += step) {
    if (h >= startH && h <= endH) {
      ticks.push({ hour: h, label: formatFn(h) });
    }
  }

  const maxTicks = 8;
  if (ticks.length > maxTicks) {
    const keep: typeof ticks = [];
    const skipStep = Math.ceil(ticks.length / maxTicks);
    for (let i = 0; i < ticks.length; i += skipStep) {
      keep.push(ticks[i]);
    }
    return keep;
  }
  return ticks;
}

function HourlyChart({ hourlyData, selectedSessions, selectedDate, userTimezone = 'Europe/Paris' }: HourlyChartProps) {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [centerHour, setCenterHour] = useState<number>(12);
  const zoomRef = useRef<number>(1);
  const centerRef = useRef<number>(12);
  const pinchBaseZoom = useRef<number>(1);
  const pinchBaseDistance = useRef<number>(0);
  const panBaseCenter = useRef<number>(12);
  const activeTouches = useRef<number>(0);

  const resolvedSessions = useMemo(
    () => getSessionTimesForDate(selectedSessions, selectedDate, userTimezone),
    [selectedSessions, selectedDate, userTimezone],
  );

  const currentHour = useMemo(() => {
    const now = new Date();
    return now.getHours() + now.getMinutes() / 60;
  }, []);

  const currentStress = useMemo(() => {
    const nowH = Math.floor(currentHour);
    const point = hourlyData.find((p) => p.hour === nowH);
    return point?.stress ?? hourlyData[hourlyData.length - 1]?.stress ?? 0;
  }, [hourlyData, currentHour]);

  const stressInfo = useMemo(() => getStressLabel(currentStress), [currentStress]);

  const stats = useMemo(() => {
    if (hourlyData.length === 0) return { avg: 0, max: 0, min: 0 };
    const stresses = hourlyData.map((p) => p.stress);
    const avg = Math.round(stresses.reduce((a, b) => a + b, 0) / stresses.length);
    const max = Math.max(...stresses);
    const min = Math.min(...stresses);
    return { avg, max, min };
  }, [hourlyData]);

  const visibleRange = useMemo(() => {
    const windowH = 24 / zoomLevel;
    let start = centerHour - windowH / 2;
    let end = centerHour + windowH / 2;
    if (start < 0) { start = 0; end = windowH; }
    if (end > 24) { end = 24; start = 24 - windowH; }
    return { start: Math.max(0, start), end: Math.min(24, end) };
  }, [zoomLevel, centerHour]);

  const clampCenter = useCallback((c: number, zoom: number) => {
    const windowH = 24 / zoom;
    const minC = windowH / 2;
    const maxC = 24 - windowH / 2;
    return Math.max(minC, Math.min(maxC, c));
  }, []);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_evt, gestureState) => {
      if (zoomRef.current > 1.05) return Math.abs(gestureState.dx) > 5;
      return false;
    },
    onPanResponderGrant: (evt) => {
      activeTouches.current = evt.nativeEvent.touches?.length ?? 1;
      if (activeTouches.current >= 2 && evt.nativeEvent.touches) {
        const t = evt.nativeEvent.touches;
        const dx = (t[0]?.pageX ?? 0) - (t[1]?.pageX ?? 0);
        const dy = (t[0]?.pageY ?? 0) - (t[1]?.pageY ?? 0);
        pinchBaseDistance.current = Math.sqrt(dx * dx + dy * dy);
        pinchBaseZoom.current = zoomRef.current;
      }
      panBaseCenter.current = centerRef.current;
    },
    onPanResponderMove: (evt, gestureState) => {
      const touches = evt.nativeEvent.touches;
      const touchCount = touches?.length ?? 1;
      activeTouches.current = touchCount;

      if (touchCount >= 2 && touches && touches[0] && touches[1]) {
        const dx = (touches[0].pageX ?? 0) - (touches[1].pageX ?? 0);
        const dy = (touches[0].pageY ?? 0) - (touches[1].pageY ?? 0);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (pinchBaseDistance.current > 0) {
          const scale = dist / pinchBaseDistance.current;
          const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pinchBaseZoom.current * scale));
          zoomRef.current = newZoom;
          const newCenter = clampCenter(centerRef.current, newZoom);
          centerRef.current = newCenter;
          setZoomLevel(newZoom);
          setCenterHour(newCenter);
        }
      } else if (zoomRef.current > 1.05) {
        const windowH = 24 / zoomRef.current;
        const hoursPerPixel = windowH / CHART_INNER_W;
        const newCenter = clampCenter(panBaseCenter.current - gestureState.dx * hoursPerPixel, zoomRef.current);
        centerRef.current = newCenter;
        setCenterHour(newCenter);
      }
    },
    onPanResponderRelease: () => {
      activeTouches.current = 0;
    },
  }), [clampCenter]);

  const handleResetZoom = useCallback(() => {
    zoomRef.current = 1;
    centerRef.current = 12;
    setZoomLevel(1);
    setCenterHour(12);
  }, []);

  const sessionZones = useMemo(() => {
    return resolvedSessions.map((s) => {
      let startH = s.startHour;
      let endH = s.endHour;
      if (endH < startH) endH += 24;
      startH = Math.max(visibleRange.start, startH);
      endH = Math.min(visibleRange.end, endH);
      if (endH <= startH) return null;
      const rangeW = visibleRange.end - visibleRange.start;
      const x = CHART_LEFT_PAD + ((startH - visibleRange.start) / rangeW) * CHART_INNER_W;
      const w = ((endH - startH) / rangeW) * CHART_INNER_W;
      return {
        id: s.id,
        x,
        width: Math.max(0, w),
        color: SESSION_ZONE_COLORS[s.id] ?? 'rgba(255,255,255,0.05)',
        labelColor: SESSION_ZONE_LABEL_COLORS[s.id] ?? 'rgba(255,255,255,0.3)',
        label: SESSION_SHORT_LABELS[s.id] ?? s.label,
      };
    }).filter((z): z is NonNullable<typeof z> => z !== null && z.width > 0);
  }, [resolvedSessions, visibleRange]);

  const bars = useMemo(() => {
    const interval = getZoomInterval(zoomLevel);
    const points: { hour: number; stress: number }[] = [];
    for (let h = visibleRange.start; h < visibleRange.end; h += interval) {
      points.push({ hour: h, stress: interpolateStress(hourlyData, h) });
    }
    if (points.length === 0) return [];
    const rangeW = visibleRange.end - visibleRange.start;
    const barGap = zoomLevel >= 4 ? 0.5 : 1;
    const barWidth = Math.max(1.5, (CHART_INNER_W - (points.length - 1) * barGap) / points.length);
    return points.map((point) => {
      const x = CHART_LEFT_PAD + ((point.hour - visibleRange.start) / rangeW) * CHART_INNER_W;
      const barH = (point.stress / 100) * CHART_INNER_H;
      const y = CHART_TOP_PAD + CHART_INNER_H - barH;
      return {
        x: x - barWidth / 2,
        y,
        width: barWidth,
        height: barH,
        color: getBarColor(point.stress),
        stress: point.stress,
        hour: point.hour,
      };
    });
  }, [hourlyData, zoomLevel, visibleRange]);

  const xTicks = useMemo(() => getXTicksForZoom(visibleRange.start, visibleRange.end, zoomLevel), [visibleRange, zoomLevel]);
  const yTicks = [25, 50, 75, 100];
  const isZoomed = zoomLevel > 1.05;

  return (
    <View style={chartStyles.wrapper}>
      <View style={chartStyles.badgeRow}>
        <View style={chartStyles.timeBadge}>
          <Clock color="rgba(255,255,255,0.6)" size={12} />
          <Text style={chartStyles.timeBadgeText}>
            {Math.floor(currentHour).toString().padStart(2, '0')}h{String(Math.floor((currentHour % 1) * 60)).padStart(2, '0')}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {isZoomed ? (
            <Pressable onPress={handleResetZoom} style={chartStyles.zoomResetBadge} hitSlop={10}>
              <Minimize2 color="rgba(255,255,255,0.6)" size={11} />
              <Text style={chartStyles.zoomResetText}>×{zoomLevel.toFixed(1)}</Text>
            </Pressable>
          ) : (
            <View style={chartStyles.zoomHintBadge}>
              <Maximize2 color="rgba(255,255,255,0.25)" size={10} />
              <Text style={chartStyles.zoomHintText}>{Platform.OS === 'web' ? 'Zoom' : 'Pincez'}</Text>
            </View>
          )}
          <View style={[chartStyles.stressBadge, { backgroundColor: stressInfo.bg }]}>
            <Text style={[chartStyles.stressBadgeText, { color: stressInfo.color }]}>{stressInfo.text}</Text>
          </View>
        </View>
      </View>

      <View style={chartStyles.statsRow}>
        <View style={chartStyles.statItem}>
          <BarChart3 color="#FF9500" size={14} />
          <Text style={chartStyles.statValue}>{stats.avg}</Text>
          <Text style={chartStyles.statLabel}>Moy.</Text>
        </View>
        <View style={chartStyles.statItem}>
          <ArrowUp color="#FF3B30" size={14} />
          <Text style={[chartStyles.statValue, { color: '#FF3B30' }]}>{stats.max}</Text>
          <Text style={chartStyles.statLabel}>Pic</Text>
        </View>
        <View style={chartStyles.statItem}>
          <ArrowDown color="#00C48C" size={14} />
          <Text style={[chartStyles.statValue, { color: '#00C48C' }]}>{stats.min}</Text>
          <Text style={chartStyles.statLabel}>Min</Text>
        </View>
      </View>

      <View style={chartStyles.svgWrap} {...panResponder.panHandlers}>
        <Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}>
          <Rect x={CHART_LEFT_PAD} y={CHART_TOP_PAD} width={CHART_INNER_W} height={CHART_INNER_H} rx={4} fill="rgba(255,255,255,0.015)" />

          {sessionZones.map((zone) => (
            <G key={`zone-${zone.id}`}>
              <Rect
                x={zone.x}
                y={CHART_TOP_PAD}
                width={zone.width}
                height={CHART_INNER_H}
                fill={zone.color}
              />
              <SvgText
                x={zone.x + zone.width / 2}
                y={CHART_TOP_PAD + 12}
                fill={zone.labelColor}
                fontSize="8"
                fontWeight="600"
                textAnchor="middle"
              >
                {zone.label}
              </SvgText>
            </G>
          ))}

          {yTicks.map((tick) => {
            const y = CHART_TOP_PAD + (1 - tick / 100) * CHART_INNER_H;
            return (
              <React.Fragment key={`yt-${tick}`}>
                <Line
                  x1={CHART_LEFT_PAD}
                  y1={y}
                  x2={CHART_LEFT_PAD + CHART_INNER_W}
                  y2={y}
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="0.7"
                />
                <SvgText x={CHART_LEFT_PAD - 5} y={y + 3} fill="rgba(255,255,255,0.25)" fontSize="8" textAnchor="end">
                  {tick}
                </SvgText>
              </React.Fragment>
            );
          })}

          <Line
            x1={CHART_LEFT_PAD}
            y1={CHART_TOP_PAD + CHART_INNER_H}
            x2={CHART_LEFT_PAD + CHART_INNER_W}
            y2={CHART_TOP_PAD + CHART_INNER_H}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="0.7"
          />

          {bars.map((bar, i) => (
            <G key={`bar-${i}`}>
              <Defs>
                <SvgLinearGradient id={`barGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={bar.color} stopOpacity="0.9" />
                  <Stop offset="1" stopColor={bar.color} stopOpacity="0.3" />
                </SvgLinearGradient>
              </Defs>
              <Rect
                x={bar.x}
                y={bar.y}
                width={bar.width}
                height={bar.height}
                rx={1.5}
                fill={`url(#barGrad-${i})`}
              />
            </G>
          ))}

          {xTicks.map((tick) => {
            const rangeW = visibleRange.end - visibleRange.start;
            const x = CHART_LEFT_PAD + ((tick.hour - visibleRange.start) / rangeW) * CHART_INNER_W;
            return (
              <SvgText
                key={`xt-${tick.hour}`}
                x={x}
                y={CHART_HEIGHT - 4}
                fill="rgba(255,255,255,0.3)"
                fontSize="8"
                textAnchor="middle"
              >
                {tick.label}
              </SvgText>
            );
          })}
        </Svg>
      </View>

      <View style={[chartStyles.zoomBarOuter, { opacity: isZoomed ? 1 : 0 }]} pointerEvents="none">
        <View style={chartStyles.zoomBarTrack}>
          <View
            style={[
              chartStyles.zoomBarThumb,
              {
                left: `${(visibleRange.start / 24) * 100}%` as unknown as number,
                width: `${((visibleRange.end - visibleRange.start) / 24) * 100}%` as unknown as number,
              },
            ]}
          />
        </View>
      </View>
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

function getFallbackTrendAnalysis(avgStress: number, avgSleep: number, avgHrv: number, _range: '7d' | '30d'): string {
  const period = _range === '7d' ? 'cette semaine' : 'ce mois';
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
            <Pressable
              onPress={() => {
                if (selectedDayIndex < dayDetails.length - 1) setSelectedDayIndex(selectedDayIndex + 1);
              }}
              hitSlop={12}
              style={{ opacity: selectedDayIndex < dayDetails.length - 1 ? 1 : 0.25 }}
              testID="chart-prev-day"
            >
              <ChevronLeft color={tradnexTheme.textSecondary} size={22} />
            </Pressable>
            <View style={styles.selectedDayCenter}>
              <Text style={styles.selectedDayLabel}>{selectedDay.dayLabel}</Text>
              <Text style={styles.selectedDateLabel}>{selectedDay.dateLabel}</Text>
            </View>
            <Pressable
              onPress={() => {
                if (selectedDayIndex > 0) setSelectedDayIndex(selectedDayIndex - 1);
              }}
              hitSlop={12}
              style={{ opacity: selectedDayIndex > 0 ? 1 : 0.25 }}
              testID="chart-next-day"
            >
              <ChevronRight color={tradnexTheme.textSecondary} size={22} />
            </Pressable>
            <Pressable onPress={() => setInfoVisible(true)} hitSlop={12} testID="history-info-btn" style={{ marginLeft: 6 }}>
              <Info color={tradnexTheme.textMuted} size={18} />
            </Pressable>
          </View>

          <HourlyChart
            hourlyData={selectedDay.hourlyData}
            selectedSessions={settings.tradingSessions ?? ['newyork']}
            selectedDate={selectedDay.date}
            userTimezone={settings.timezone ?? 'Europe/Paris'}
          />
        </View>
      ) : null}

      <CalendarGrid
        days={dayDetails}
        selectedIndex={selectedDayIndex}
        onSelect={handleSelectDay}
      />

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
        variant="bar"
        metricType="stress"
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
        metricType="sleep"
        bgColor="rgba(10,132,255,0.06)"
        testID="sleep-trend-chart"
      />
      <TrendChart
        title="Récupération"
        subtitle="Variabilité cardiaque (HRV)"
        color={tradnexTheme.warning}
        data={selectedHistory.map((item, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (selectedHistory.length - 1 - i));
          return { label: item.dateLabel, value: item.hrv, dayOfWeek: d.getDay() };
        })}
        variant="bar"
        metricType="hrv"
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
  wrapper: {
    gap: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  timeBadgeText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '600' as const,
  },
  stressBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stressBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statValue: {
    color: tradnexTheme.textPrimary,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  statLabel: {
    color: tradnexTheme.textMuted,
    fontSize: 11,
  },
  svgWrap: {
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
    overflow: 'hidden',
  },
  zoomResetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(10,132,255,0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  zoomResetText: {
    color: 'rgba(10,132,255,0.9)',
    fontSize: 10,
    fontWeight: '700' as const,
  },
  zoomHintBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  zoomHintText: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 9,
    fontWeight: '600' as const,
  },
  zoomBarOuter: {
    paddingHorizontal: 32,
    marginTop: 4,
    height: 3,
  },
  zoomBarTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
    position: 'relative' as const,
  },
  zoomBarThumb: {
    position: 'absolute' as const,
    top: 0,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(10,132,255,0.5)',
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
    justifyContent: 'center',
    paddingHorizontal: 4,
    gap: 4,
  },
  selectedDayCenter: {
    flex: 1,
    alignItems: 'center',
  },
  selectedDayLabel: {
    color: tradnexTheme.textPrimary,
    fontSize: 17,
    fontWeight: '800' as const,
  },
  selectedDateLabel: {
    color: tradnexTheme.textSecondary,
    fontSize: 12,
    marginTop: 1,
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


