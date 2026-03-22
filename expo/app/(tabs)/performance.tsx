import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Lock, Minus, BarChart3, TrendingDown, TrendingUp, Zap } from 'lucide-react-native';
import Svg, { Circle, Line, G, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { tradnexTheme } from '@/constants/tradnex-theme';
import { useTradnex } from '@/providers/tradnex-provider';
import type { SessionResult } from '@/providers/tradnex-provider';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_SIZE = Math.min(SCREEN_WIDTH - 80, 300);
const CHART_PADDING = 40;
const PLOT_SIZE = CHART_SIZE - CHART_PADDING * 2;

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatTodayDate(): string {
  return new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

interface ScatterPoint {
  score: number;
  result: SessionResult;
  isToday: boolean;
}

function ScatterChart({ points }: { points: ScatterPoint[] }) {
  const resultToY = useCallback((result: SessionResult): number => {
    switch (result) {
      case 'profitable': return 0;
      case 'neutral': return 0.5;
      case 'loss': return 1;
    }
  }, []);

  const getColor = useCallback((result: SessionResult): string => {
    switch (result) {
      case 'profitable': return '#00C48C';
      case 'neutral': return '#3A3A3C';
      case 'loss': return '#FF3B30';
    }
  }, []);

  const trendLine = useMemo(() => {
    if (points.length < 3) return null;
    const n = points.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    points.forEach((p) => {
      const y = resultToY(p.result);
      sumX += p.score;
      sumY += y;
      sumXY += p.score * y;
      sumX2 += p.score * p.score;
    });
    const denom = n * sumX2 - sumX * sumX;
    if (Math.abs(denom) < 0.001) return null;
    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    const x1 = 0;
    const x2 = 100;
    const y1 = Math.max(0, Math.min(1, intercept));
    const y2 = Math.max(0, Math.min(1, slope * 100 + intercept));
    return { x1, y1, x2, y2 };
  }, [points, resultToY]);

  return (
    <View style={scatterStyles.container}>
      <Svg width={CHART_SIZE} height={CHART_SIZE} viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}>
        {[0, 25, 50, 75, 100].map((tick) => {
          const x = CHART_PADDING + (tick / 100) * PLOT_SIZE;
          return (
            <Line
              key={`vgrid-${tick}`}
              x1={x}
              y1={CHART_PADDING}
              x2={x}
              y2={CHART_PADDING + PLOT_SIZE}
              stroke="rgba(255,255,255,0.04)"
              strokeWidth={1}
            />
          );
        })}

        {[0, 0.5, 1].map((tick) => {
          const y = CHART_PADDING + tick * PLOT_SIZE;
          return (
            <Line
              key={`hgrid-${tick}`}
              x1={CHART_PADDING}
              y1={y}
              x2={CHART_PADDING + PLOT_SIZE}
              y2={y}
              stroke="rgba(255,255,255,0.04)"
              strokeWidth={1}
            />
          );
        })}

        <SvgText x={CHART_PADDING - 6} y={CHART_PADDING + 4} fill={tradnexTheme.success} fontSize={9} textAnchor="end" fontWeight="600">+</SvgText>
        <SvgText x={CHART_PADDING - 6} y={CHART_PADDING + PLOT_SIZE * 0.5 + 4} fill={tradnexTheme.textMuted} fontSize={9} textAnchor="end" fontWeight="600">=</SvgText>
        <SvgText x={CHART_PADDING - 6} y={CHART_PADDING + PLOT_SIZE + 4} fill={tradnexTheme.danger} fontSize={9} textAnchor="end" fontWeight="600">−</SvgText>

        {[0, 25, 50, 75, 100].map((tick) => {
          const x = CHART_PADDING + (tick / 100) * PLOT_SIZE;
          return (
            <SvgText key={`xlabel-${tick}`} x={x} y={CHART_SIZE - 8} fill={tradnexTheme.textMuted} fontSize={9} textAnchor="middle">
              {tick}
            </SvgText>
          );
        })}

        {trendLine ? (
          <Line
            x1={CHART_PADDING + (trendLine.x1 / 100) * PLOT_SIZE}
            y1={CHART_PADDING + trendLine.y1 * PLOT_SIZE}
            x2={CHART_PADDING + (trendLine.x2 / 100) * PLOT_SIZE}
            y2={CHART_PADDING + trendLine.y2 * PLOT_SIZE}
            stroke={tradnexTheme.accent}
            strokeWidth={2}
            strokeDasharray="6,4"
            opacity={0.7}
          />
        ) : null}

        {points.map((p, i) => {
          const cx = CHART_PADDING + (p.score / 100) * PLOT_SIZE;
          const cy = CHART_PADDING + resultToY(p.result) * PLOT_SIZE;
          const jitter = ((i * 7 + 3) % 11 - 5) * 1.5;
          const r = p.isToday ? 7 : 5;
          return (
            <G key={`point-${i}`}>
              {p.isToday ? (
                <Circle cx={cx} cy={cy + jitter} r={r + 2} fill="none" stroke="#FFFFFF" strokeWidth={2} opacity={0.6} />
              ) : null}
              <Circle cx={cx} cy={cy + jitter} r={r} fill={getColor(p.result)} opacity={p.isToday ? 1 : 0.75} />
            </G>
          );
        })}
      </Svg>

      <Text style={scatterStyles.xLabel}>Tradnex Score</Text>
    </View>
  );
}

export default function PerformanceScreen() {
  const {
    latestHealth,
    sessionLogs,
    logSessionResult,
    removeSessionResult,
    isHydrating,
  } = useTradnex();

  const [toastVisible, setToastVisible] = useState<boolean>(false);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 420, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const todayKey = useMemo(() => getTodayKey(), []);
  const todayLog = useMemo(() => sessionLogs.find((l) => l.date === todayKey) ?? null, [sessionLogs, todayKey]);
  const todayScore = latestHealth?.stress ?? 0;
  const tradnexScore = useMemo(() => Math.max(0, 100 - todayScore), [todayScore]);

  const showToast = useCallback(() => {
    setToastVisible(true);
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(1500),
      Animated.timing(toastAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => setToastVisible(false));
  }, [toastAnim]);

  const handleLog = useCallback((result: SessionResult) => {
    logSessionResult(todayKey, result, tradnexScore);
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    showToast();
    console.log('[performance] logged session:', result, 'score:', tradnexScore);
  }, [logSessionResult, todayKey, tradnexScore, showToast]);

  const handleModify = useCallback(() => {
    removeSessionResult(todayKey);
    console.log('[performance] removed session log for today');
  }, [removeSessionResult, todayKey]);

  const totalLogged = sessionLogs.length;
  const hasEnoughForChart = totalLogged >= 5;
  const hasEnoughForInsights = totalLogged >= 10;

  const scatterPoints: ScatterPoint[] = useMemo(() => {
    return sessionLogs.map((log) => ({
      score: log.score,
      result: log.result,
      isToday: log.date === todayKey,
    }));
  }, [sessionLogs, todayKey]);

  const insightThreshold = useMemo(() => {
    if (!hasEnoughForInsights) return null;
    const lossLogs = sessionLogs.filter((l) => l.result === 'loss');
    if (lossLogs.length === 0) return null;
    const avgLossScore = Math.round(lossLogs.reduce((s, l) => s + l.score, 0) / lossLogs.length);
    const sessionsBelow = sessionLogs.filter((l) => l.score <= avgLossScore);
    const lossesBelow = sessionsBelow.filter((l) => l.result === 'loss').length;
    const lossRate = sessionsBelow.length > 0 ? Math.round((lossesBelow / sessionsBelow.length) * 100) : 0;
    return { threshold: avgLossScore, lossRate };
  }, [sessionLogs, hasEnoughForInsights]);

  const insightAverages = useMemo(() => {
    if (!hasEnoughForInsights) return null;
    const profitable = sessionLogs.filter((l) => l.result === 'profitable');
    const neutral = sessionLogs.filter((l) => l.result === 'neutral');
    const loss = sessionLogs.filter((l) => l.result === 'loss');
    return {
      profitable: profitable.length > 0 ? Math.round(profitable.reduce((s, l) => s + l.score, 0) / profitable.length) : null,
      neutral: neutral.length > 0 ? Math.round(neutral.reduce((s, l) => s + l.score, 0) / neutral.length) : null,
      loss: loss.length > 0 ? Math.round(loss.reduce((s, l) => s + l.score, 0) / loss.length) : null,
    };
  }, [sessionLogs, hasEnoughForInsights]);

  const insightBestDay = useMemo(() => {
    if (!hasEnoughForInsights) return null;
    const dayPerf = new Map<number, { wins: number; total: number }>();
    sessionLogs.forEach((log) => {
      const d = new Date(log.date).getDay();
      const entry = dayPerf.get(d) ?? { wins: 0, total: 0 };
      entry.total++;
      if (log.result === 'profitable') entry.wins++;
      dayPerf.set(d, entry);
    });
    let bestDay = -1;
    let bestRate = 0;
    dayPerf.forEach((v, k) => {
      if (v.total >= 2) {
        const rate = v.wins / v.total;
        if (bestDay === -1 || rate > bestRate) {
          bestDay = k;
          bestRate = rate;
        }
      }
    });
    if (bestDay < 0) return null;
    return { name: DAY_NAMES[bestDay], rate: Math.round(bestRate * 100) };
  }, [sessionLogs, hasEnoughForInsights]);

  const cardAnims = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;

  useEffect(() => {
    if (!hasEnoughForInsights) return;
    const anims = cardAnims.map((anim, i) =>
      Animated.timing(anim, { toValue: 1, duration: 350, delay: i * 120, useNativeDriver: true })
    );
    Animated.stagger(120, anims).start();
  }, [hasEnoughForInsights, cardAnims]);

  if (isHydrating) {
    return (
      <View style={styles.background}>
        <LinearGradient colors={['#030A14', '#020609', '#000000']} style={styles.gradient}>
          <SafeAreaView edges={['top']} style={styles.safeArea}>
            <View style={styles.loadingWrap}>
              <Text style={styles.loadingText}>Chargement...</Text>
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
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} testID="performance-scroll">
            <Animated.View style={[styles.inner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

              <View style={styles.headerRow}>
                <Text style={styles.pageTitle}>Ma Performance</Text>
                <View style={styles.scoreBadge}>
                  <Text style={styles.scoreBadgeLabel}>Score</Text>
                  <Text style={styles.scoreBadgeValue}>{tradnexScore}</Text>
                </View>
              </View>
              <Text style={styles.dateText}>{formatTodayDate()}</Text>

              <View style={styles.loggingCard}>
                <Text style={styles.loggingQuestion}>Comment s'est passée votre session aujourd'hui ?</Text>

                {todayLog ? (
                  <View style={styles.loggedState}>
                    <View style={[
                      styles.loggedResultCard,
                      {
                        backgroundColor: todayLog.result === 'profitable' ? '#00C48C' :
                          todayLog.result === 'loss' ? '#FF3B30' : '#3A3A3C',
                      },
                    ]}>
                      {todayLog.result === 'profitable' ? <TrendingUp color="#FFF" size={22} /> :
                        todayLog.result === 'loss' ? <TrendingDown color="#FFF" size={22} /> :
                          <Minus color="#FFF" size={22} />}
                      <Text style={styles.loggedResultText}>
                        {todayLog.result === 'profitable' ? 'Profitable' : todayLog.result === 'loss' ? 'Perte' : 'Neutre'}
                      </Text>
                      <Text style={styles.loggedResultScore}>Score {todayLog.score}</Text>
                    </View>
                    <Pressable onPress={handleModify} hitSlop={8} testID="modify-session-btn">
                      <Text style={styles.modifyText}>Modifier</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.buttonsRow}>
                    <Pressable
                      style={[styles.resultBtn, { backgroundColor: '#00C48C' }]}
                      onPress={() => handleLog('profitable')}
                      testID="log-profitable"
                    >
                      <TrendingUp color="#FFF" size={20} />
                      <Text style={styles.resultBtnText}>Profitable</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.resultBtn, { backgroundColor: '#3A3A3C' }]}
                      onPress={() => handleLog('neutral')}
                      testID="log-neutral"
                    >
                      <Minus color="#FFF" size={20} />
                      <Text style={styles.resultBtnText}>Neutre</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.resultBtn, { backgroundColor: '#FF3B30' }]}
                      onPress={() => handleLog('loss')}
                      testID="log-loss"
                    >
                      <TrendingDown color="#FFF" size={20} />
                      <Text style={styles.resultBtnText}>Perte</Text>
                    </Pressable>
                  </View>
                )}
              </View>

              <View style={styles.separator} />
              <Text style={styles.sectionTitle}>Corrélation score / résultat</Text>

              {!hasEnoughForChart ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconWrap}>
                    <BarChart3 color={tradnexTheme.accent} size={36} />
                  </View>
                  <Text style={styles.emptyTitle}>Vos insights se construisent</Text>
                  <Text style={styles.emptyText}>
                    Loguez vos sessions pour découvrir comment votre état physique impacte vos performances.
                  </Text>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${Math.min(100, (totalLogged / 5) * 100)}%` }]} />
                  </View>
                  <Text style={styles.progressText}>{totalLogged}/5 sessions loguées</Text>

                  <View style={styles.lockedCards}>
                    <View style={styles.lockedCard}>
                      <Lock color={tradnexTheme.textMuted} size={18} />
                      <Text style={styles.lockedCardTitle}>Seuil critique</Text>
                      <Text style={styles.lockedCardBlur}>Score sous ██, vous perdez ██%</Text>
                    </View>
                    <View style={styles.lockedCard}>
                      <Lock color={tradnexTheme.textMuted} size={18} />
                      <Text style={styles.lockedCardTitle}>Scores moyens</Text>
                      <Text style={styles.lockedCardBlur}>Profitable : ██ / Perte : ██</Text>
                    </View>
                    <View style={styles.lockedCard}>
                      <Lock color={tradnexTheme.textMuted} size={18} />
                      <Text style={styles.lockedCardTitle}>Meilleur jour</Text>
                      <Text style={styles.lockedCardBlur}>██████ — ██% profitables</Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.activeState}>
                  <View style={styles.chartWrap}>
                    <ScatterChart points={scatterPoints} />
                  </View>

                  {hasEnoughForInsights ? (
                    <View style={styles.insightsContainer}>
                      {insightThreshold ? (
                        <Animated.View style={[styles.insightCard, { opacity: cardAnims[0], transform: [{ translateY: cardAnims[0].interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>
                          <View style={styles.insightIconWrap}>
                            <Zap color={tradnexTheme.accent} size={18} />
                          </View>
                          <Text style={styles.insightTitle}>Votre seuil critique</Text>
                          <Text style={styles.insightText}>
                            Quand votre Tradnex Score est sous <Text style={styles.insightHighlight}>{insightThreshold.threshold}</Text>, vous perdez <Text style={styles.insightHighlight}>{insightThreshold.lossRate}%</Text> du temps.
                          </Text>
                        </Animated.View>
                      ) : null}

                      {insightAverages ? (
                        <Animated.View style={[styles.insightCard, { opacity: cardAnims[1], transform: [{ translateY: cardAnims[1].interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>
                          <View style={styles.insightIconWrap}>
                            <BarChart3 color={tradnexTheme.accent} size={18} />
                          </View>
                          <Text style={styles.insightTitle}>Vos scores moyens</Text>
                          <View style={styles.avgRows}>
                            {insightAverages.profitable !== null ? (
                              <View style={styles.avgRow}>
                                <View style={[styles.avgDot, { backgroundColor: '#00C48C' }]} />
                                <Text style={[styles.avgLabel, { color: '#00C48C' }]}>Profitable : <Text style={styles.insightHighlight}>{insightAverages.profitable}</Text>/100 en moyenne</Text>
                              </View>
                            ) : null}
                            {insightAverages.neutral !== null ? (
                              <View style={styles.avgRow}>
                                <View style={[styles.avgDot, { backgroundColor: tradnexTheme.textMuted }]} />
                                <Text style={[styles.avgLabel, { color: tradnexTheme.textMuted }]}>Neutre : <Text style={styles.insightHighlight}>{insightAverages.neutral}</Text>/100 en moyenne</Text>
                              </View>
                            ) : null}
                            {insightAverages.loss !== null ? (
                              <View style={styles.avgRow}>
                                <View style={[styles.avgDot, { backgroundColor: '#FF3B30' }]} />
                                <Text style={[styles.avgLabel, { color: '#FF3B30' }]}>Perte : <Text style={styles.insightHighlight}>{insightAverages.loss}</Text>/100 en moyenne</Text>
                              </View>
                            ) : null}
                          </View>
                        </Animated.View>
                      ) : null}

                      {insightBestDay ? (
                        <Animated.View style={[styles.insightCard, { opacity: cardAnims[2], transform: [{ translateY: cardAnims[2].interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>
                          <View style={styles.insightIconWrap}>
                            <Calendar color={tradnexTheme.accent} size={18} />
                          </View>
                          <Text style={styles.insightTitle}>Votre meilleur jour</Text>
                          <Text style={styles.insightText}>
                            Vous tradez mieux le <Text style={styles.insightHighlight}>{insightBestDay.name}</Text>. <Text style={styles.insightHighlight}>{insightBestDay.rate}%</Text> de vos sessions {insightBestDay.name} sont profitables.
                          </Text>
                        </Animated.View>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              )}

            </Animated.View>
          </ScrollView>

          {toastVisible ? (
            <Animated.View style={[styles.toast, { opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
              <Text style={styles.toastText}>Session loguée ✓</Text>
            </Animated.View>
          ) : null}

        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const scatterStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
  },
  xLabel: {
    color: tradnexTheme.textMuted,
    fontSize: 11,
    fontWeight: '600' as const,
    marginTop: -4,
  },
});

const styles = StyleSheet.create({
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
    gap: 16,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: tradnexTheme.textMuted,
    fontSize: 15,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 28,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(10,132,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(10,132,255,0.25)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  scoreBadgeLabel: {
    color: tradnexTheme.textMuted,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  scoreBadgeValue: {
    color: tradnexTheme.accent,
    fontSize: 16,
    fontWeight: '800' as const,
  },
  dateText: {
    color: tradnexTheme.textMuted,
    fontSize: 13,
    marginTop: -8,
    textTransform: 'capitalize' as const,
  },
  loggingCard: {
    borderRadius: 22,
    backgroundColor: tradnexTheme.surface,
    borderWidth: 1,
    borderColor: tradnexTheme.border,
    padding: 18,
    gap: 16,
  },
  loggingQuestion: {
    color: tradnexTheme.textPrimary,
    fontSize: 15,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  resultBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
    borderRadius: 16,
  },
  resultBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700' as const,
  },
  loggedState: {
    alignItems: 'center',
    gap: 12,
  },
  loggedResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    alignSelf: 'center' as const,
  },
  loggedResultText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800' as const,
  },
  loggedResultScore: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  modifyText: {
    color: tradnexTheme.textMuted,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 4,
  },
  sectionTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 20,
    fontWeight: '800' as const,
  },
  emptyState: {
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(10,132,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 18,
    fontWeight: '800' as const,
  },
  emptyText: {
    color: tradnexTheme.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center' as const,
    paddingHorizontal: 20,
  },
  progressBarBg: {
    width: '80%',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden' as const,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: tradnexTheme.accent,
  },
  progressText: {
    color: tradnexTheme.accent,
    fontSize: 13,
    fontWeight: '700' as const,
  },
  lockedCards: {
    gap: 10,
    width: '100%',
    marginTop: 8,
  },
  lockedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 14,
  },
  lockedCardTitle: {
    color: tradnexTheme.textMuted,
    fontSize: 13,
    fontWeight: '700' as const,
    flex: 1,
  },
  lockedCardBlur: {
    color: 'rgba(255,255,255,0.12)',
    fontSize: 12,
  },
  activeState: {
    gap: 20,
  },
  chartWrap: {
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: tradnexTheme.border,
    padding: 12,
    alignItems: 'center',
  },
  insightsContainer: {
    gap: 12,
  },
  insightCard: {
    borderRadius: 18,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: tradnexTheme.border,
    padding: 16,
    gap: 10,
  },
  insightIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(10,132,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  insightText: {
    color: tradnexTheme.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  insightHighlight: {
    color: tradnexTheme.accent,
    fontWeight: '700' as const,
  },
  avgRows: {
    gap: 8,
  },
  avgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avgDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  avgLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  toast: {
    position: 'absolute' as const,
    bottom: 24,
    alignSelf: 'center' as const,
    backgroundColor: 'rgba(10,132,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(10,132,255,0.35)',
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  toastText: {
    color: tradnexTheme.textPrimary,
    fontSize: 14,
    fontWeight: '700' as const,
  },
});
