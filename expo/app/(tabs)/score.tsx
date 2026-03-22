import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, HeartPulse, MoonStar, Zap } from 'lucide-react-native';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop, Line, Polyline, Text as SvgText } from 'react-native-svg';

import { tradnexTheme, tradnexShadow } from '@/constants/tradnex-theme';
import { useTradnex } from '@/providers/tradnex-provider';
import { getScoreVerdict, getScoreColor } from '@/utils/tradnex';

const GAUGE_SIZE = 280;
const GAUGE_STROKE = 20;
const GAUGE_RADIUS = (GAUGE_SIZE - GAUGE_STROKE) / 2;
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS;

function ScoreGauge({ score }: { score: number }) {
  const progressOffset = GAUGE_CIRCUMFERENCE - (Math.max(0, Math.min(100, score)) / 100) * GAUGE_CIRCUMFERENCE;
  const color = useMemo(() => getScoreColor(score), [score]);

  return (
    <View style={gaugeStyles.container}>
      <View style={gaugeStyles.glow} />
      <Svg height={GAUGE_SIZE} width={GAUGE_SIZE}>
        <Defs>
          <SvgLinearGradient id="scoreGaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={tradnexTheme.accent} />
            <Stop offset="100%" stopColor={color} />
          </SvgLinearGradient>
        </Defs>
        <Circle
          cx={GAUGE_SIZE / 2}
          cy={GAUGE_SIZE / 2}
          r={GAUGE_RADIUS}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={GAUGE_STROKE}
          fill="transparent"
        />
        <Circle
          cx={GAUGE_SIZE / 2}
          cy={GAUGE_SIZE / 2}
          r={GAUGE_RADIUS}
          stroke="url(#scoreGaugeGrad)"
          strokeWidth={GAUGE_STROKE}
          fill="transparent"
          strokeDasharray={`${GAUGE_CIRCUMFERENCE} ${GAUGE_CIRCUMFERENCE}`}
          strokeDashoffset={progressOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${GAUGE_SIZE / 2} ${GAUGE_SIZE / 2})`}
        />
      </Svg>
    </View>
  );
}

function ScoreTrendChart({ data }: { data: { date: string; score: number }[] }) {
  const width = 320;
  const height = 140;
  const padL = 36;
  const padR = 14;
  const padT = 14;
  const padB = 24;
  const cW = width - padL - padR;
  const cH = height - padT - padB;

  const points = useMemo(() => {
    if (data.length < 2) return '';
    return data.map((d, i) => {
      const x = padL + (i / (data.length - 1)) * cW;
      const y = padT + (1 - d.score / 100) * cH;
      return `${x},${y}`;
    }).join(' ');
  }, [data, cW, cH]);

  const yTicks = [0, 25, 50, 75, 100];

  return (
    <View style={trendStyles.card}>
      <Text style={trendStyles.title}>{"\u00c9"}volution sur 7 jours</Text>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {yTicks.map(tick => {
          const y = padT + (1 - tick / 100) * cH;
          return (
            <React.Fragment key={`yt-${tick}`}>
              <Line x1={padL} y1={y} x2={width - padR} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
              <SvgText x={padL - 6} y={y + 4} fill="rgba(255,255,255,0.3)" fontSize="9" textAnchor="end">{tick}</SvgText>
            </React.Fragment>
          );
        })}
        {points ? (
          <Polyline
            points={points}
            fill="none"
            stroke={tradnexTheme.accent}
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}
      </Svg>
      <View style={trendStyles.labels}>
        {data.map((d, i) => (
          <Text key={`${d.date}-${i}`} style={trendStyles.label}>{d.date}</Text>
        ))}
      </View>
    </View>
  );
}

export default function ScoreScreen() {
  const { tradnexScore, scoreHistory, isHydrating, healthConsentAccepted } = useTradnex();

  const [displayScore, setDisplayScore] = useState<number>(0);
  const countAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 420, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    if (tradnexScore) {
      countAnim.setValue(0);
      Animated.timing(countAnim, {
        toValue: tradnexScore.total,
        duration: 1000,
        useNativeDriver: false,
      }).start();

      const listener = countAnim.addListener(({ value }) => {
        setDisplayScore(Math.round(value));
      });
      return () => countAnim.removeListener(listener);
    }
    return undefined;
  }, [tradnexScore, countAnim]);

  const verdict = useMemo(() => {
    if (!tradnexScore) return null;
    return getScoreVerdict(tradnexScore.total);
  }, [tradnexScore]);

  const scoreColor = useMemo(() => {
    if (!tradnexScore) return tradnexTheme.accent;
    return getScoreColor(tradnexScore.total);
  }, [tradnexScore]);

  if (isHydrating || !healthConsentAccepted) {
    return (
      <View style={styles.background}>
        <LinearGradient colors={['#04101E', '#020810', '#000000']} style={styles.gradient}>
          <SafeAreaView edges={['top']} style={styles.safeArea}>
            <View style={styles.loadingCard}><Text style={styles.loadingTitle}>Chargement</Text></View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  const components = [
    { label: 'Sommeil', value: tradnexScore?.sleep ?? 0, max: 30, icon: <MoonStar color={tradnexTheme.success} size={18} />, color: tradnexTheme.success },
    { label: 'HRV', value: tradnexScore?.hrv ?? 0, max: 30, icon: <Activity color={tradnexTheme.warning} size={18} />, color: tradnexTheme.warning },
    { label: 'Stress', value: tradnexScore?.stress ?? 0, max: 20, icon: <Zap color={tradnexTheme.accent} size={18} />, color: tradnexTheme.accent },
    { label: 'FC repos', value: tradnexScore?.heartRate ?? 0, max: 20, icon: <HeartPulse color={tradnexTheme.danger} size={18} />, color: tradnexTheme.danger },
  ];

  return (
    <View style={styles.background}>
      <LinearGradient colors={['#04101E', '#020810', '#000000']} style={styles.gradient}>
        <SafeAreaView edges={['top']} style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Animated.View style={[styles.inner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <Text style={styles.pageTitle}>Tradnex Score</Text>

              <View style={styles.gaugeWrapper}>
                <ScoreGauge score={tradnexScore?.total ?? 0} />
                <View style={styles.gaugeCenter}>
                  <Text style={styles.gaugeEyebrow}>TRADNEX</Text>
                  <Text style={[styles.gaugeValue, { color: scoreColor }]}>{displayScore}</Text>
                  <Text style={styles.gaugeMax}>/100</Text>
                </View>
              </View>

              {verdict ? (
                <View style={[styles.verdictCard, { borderColor: verdict.color + '35' }]}>
                  <View style={[styles.verdictDot, { backgroundColor: verdict.color }]} />
                  <Text style={[styles.verdictText, { color: verdict.color }]}>{verdict.label}</Text>
                </View>
              ) : null}

              <View style={styles.componentsGrid}>
                {components.map((comp) => {
                  const ratio = comp.value / comp.max;
                  const cardColor = ratio >= 0.8 ? tradnexTheme.success : ratio >= 0.5 ? tradnexTheme.warning : tradnexTheme.danger;
                  return (
                    <View key={comp.label} style={styles.componentCard}>
                      {comp.icon}
                      <Text style={styles.componentLabel}>{comp.label}</Text>
                      <View style={styles.componentValueRow}>
                        <Text style={[styles.componentValue, { color: cardColor }]}>{comp.value}</Text>
                        <Text style={styles.componentMax}>/{comp.max}</Text>
                      </View>
                      <View style={styles.componentBar}>
                        <View style={[styles.componentBarFill, { width: `${ratio * 100}%`, backgroundColor: cardColor }]} />
                      </View>
                    </View>
                  );
                })}
              </View>

              {scoreHistory.length > 1 ? (
                <ScoreTrendChart data={scoreHistory} />
              ) : null}
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const gaugeStyles = StyleSheet.create({
  container: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    width: GAUGE_SIZE,
    height: GAUGE_SIZE,
    borderRadius: 999,
    backgroundColor: '#050A10',
    borderWidth: 1,
    borderColor: tradnexTheme.borderStrong,
    ...tradnexShadow,
  },
  glow: {
    position: 'absolute' as const,
    width: GAUGE_SIZE - 30,
    height: GAUGE_SIZE - 30,
    borderRadius: 999,
    backgroundColor: 'rgba(10,132,255,0.05)',
  },
});

const trendStyles = StyleSheet.create({
  card: {
    borderRadius: 24,
    backgroundColor: tradnexTheme.surface,
    borderWidth: 1,
    borderColor: tradnexTheme.border,
    padding: 18,
    gap: 10,
  },
  title: {
    color: tradnexTheme.textPrimary,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  labels: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    paddingLeft: 28,
  },
  label: {
    color: tradnexTheme.textMuted,
    fontSize: 10,
    flex: 1,
    textAlign: 'center' as const,
  },
});

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: tradnexTheme.background,
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
    gap: 20,
  },
  pageTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 32,
    fontWeight: '800' as const,
    lineHeight: 38,
  },
  gaugeWrapper: {
    alignSelf: 'center' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  gaugeCenter: {
    position: 'absolute' as const,
    alignItems: 'center' as const,
    gap: 2,
  },
  gaugeEyebrow: {
    color: tradnexTheme.textMuted,
    fontSize: 11,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 2,
  },
  gaugeValue: {
    fontSize: 64,
    fontWeight: '800' as const,
  },
  gaugeMax: {
    color: tradnexTheme.textMuted,
    fontSize: 16,
    fontWeight: '600' as const,
    marginTop: -6,
  },
  verdictCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
  },
  verdictDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  verdictText: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
    flex: 1,
  },
  componentsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
  },
  componentCard: {
    flex: 1,
    minWidth: '45%' as unknown as number,
    borderRadius: 20,
    backgroundColor: tradnexTheme.surface,
    borderWidth: 1,
    borderColor: tradnexTheme.border,
    padding: 16,
    gap: 8,
  },
  componentLabel: {
    color: tradnexTheme.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  componentValueRow: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    gap: 2,
  },
  componentValue: {
    fontSize: 28,
    fontWeight: '800' as const,
  },
  componentMax: {
    color: tradnexTheme.textMuted,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  componentBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden' as const,
  },
  componentBarFill: {
    height: 4,
    borderRadius: 2,
  },
  loadingCard: {
    borderRadius: 28,
    backgroundColor: tradnexTheme.surface,
    borderWidth: 1,
    borderColor: tradnexTheme.border,
    padding: 24,
    margin: 20,
  },
  loadingTitle: {
    color: tradnexTheme.textPrimary,
    fontSize: 22,
    fontWeight: '800' as const,
  },
});
