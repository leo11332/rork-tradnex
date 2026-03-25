import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { tradnexTheme } from '@/constants/tradnex-theme';

function getScoreColor(score: number): string {
  if (score >= 70) return tradnexTheme.success;
  if (score >= 40) return tradnexTheme.warning;
  return tradnexTheme.danger;
}

function getScoreVerdict(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'CONDITIONS OPTIMALES', color: tradnexTheme.success };
  if (score >= 65) return { label: 'CONDITIONS FAVORABLES', color: tradnexTheme.success };
  if (score >= 50) return { label: '\u00C0 SURVEILLER', color: tradnexTheme.warning };
  if (score >= 35) return { label: 'SESSION RISQU\u00C9E', color: tradnexTheme.warning };
  return { label: 'SESSION D\u00C9CONSEILL\u00C9E', color: tradnexTheme.danger };
}

interface StressGaugeProps {
  value: number;
}

export function StressGauge({ value }: StressGaugeProps) {
  const size = 240;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, value)) / 100;
  const progressOffset = circumference - progress * circumference;
  const gaugeColor = useMemo(() => getScoreColor(value), [value]);
  const ringColor = useMemo(() => getScoreColor(value), [value]);
  const verdict = useMemo(() => getScoreVerdict(value), [value]);

  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [scaleAnim, opacityAnim]);

  return (
    <View style={styles.wrapper} testID="stress-gauge">
      <Animated.View style={[styles.container, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
        <Svg height={size} width={size}>
          <Defs>
            <LinearGradient id="whoopGaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={ringColor} stopOpacity="0.6" />
              <Stop offset="50%" stopColor={ringColor} stopOpacity="1" />
              <Stop offset="100%" stopColor={ringColor} stopOpacity="0.8" />
            </LinearGradient>
          </Defs>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
            fill={tradnexTheme.surface}
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#whoopGaugeGradient)"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={progressOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={styles.center}>
          <Text style={styles.brandLabel}>TRADNEX</Text>
          <View style={styles.valueRow}>
            <Text style={[styles.value, { color: gaugeColor }]}>{value}</Text>
            <Text style={[styles.percent, { color: gaugeColor }]}>%</Text>
          </View>
          <Text style={styles.scoreLabel}>SCORE GLOBAL</Text>
        </View>
      </Animated.View>
      <View style={[styles.verdictPill, { backgroundColor: verdict.color + '14' }]}>
        <View style={[styles.verdictDot, { backgroundColor: verdict.color }]} />
        <Text style={[styles.verdictText, { color: verdict.color }]}>{verdict.label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center' as const,
    gap: 16,
  },
  container: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    alignSelf: 'center' as const,
    width: 240,
    height: 240,
  },
  center: {
    position: 'absolute' as const,
    alignItems: 'center' as const,
    gap: 2,
  },
  brandLabel: {
    color: tradnexTheme.textMuted,
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 3,
    marginBottom: 2,
  },
  valueRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-end' as const,
  },
  value: {
    fontSize: 64,
    fontWeight: '800' as const,
    lineHeight: 68,
  },
  percent: {
    fontSize: 28,
    fontWeight: '700' as const,
    marginBottom: 8,
    marginLeft: 2,
  },
  scoreLabel: {
    color: tradnexTheme.textMuted,
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  verdictPill: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  verdictDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  verdictText: {
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
  },
});
