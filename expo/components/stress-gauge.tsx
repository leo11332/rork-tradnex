import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { tradnexShadow, tradnexTheme } from '@/constants/tradnex-theme';

function getScoreColor(score: number): string {
  if (score >= 70) return tradnexTheme.success;
  if (score >= 40) return tradnexTheme.warning;
  return tradnexTheme.danger;
}

function getScoreVerdict(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Conditions optimales', color: tradnexTheme.success };
  if (score >= 65) return { label: 'Conditions favorables', color: tradnexTheme.success };
  if (score >= 50) return { label: '\u00C0 surveiller', color: tradnexTheme.warning };
  if (score >= 35) return { label: 'Session risqu\u00E9e', color: tradnexTheme.warning };
  return { label: 'Session d\u00E9conseill\u00E9e', color: tradnexTheme.danger };
}

interface StressGaugeProps {
  value: number;
}

export function StressGauge({ value }: StressGaugeProps) {
  const size = 248;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (Math.max(0, Math.min(100, value)) / 100) * circumference;
  const gaugeColor = useMemo(() => getScoreColor(value), [value]);
  const verdict = useMemo(() => getScoreVerdict(value), [value]);

  return (
    <View style={styles.wrapper} testID="stress-gauge">
      <View style={styles.container}>
        <View style={styles.glow} />
        <Svg height={size} width={size}>
          <Defs>
            <LinearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={tradnexTheme.accent} />
              <Stop offset="100%" stopColor={gaugeColor} />
            </LinearGradient>
          </Defs>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#gaugeGradient)"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={progressOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={styles.center}>
          <Text style={styles.eyebrow}>TRADNEX</Text>
          <Text style={[styles.value, { color: gaugeColor }]}>{value}</Text>
          <Text style={styles.outOf}>/100</Text>
        </View>
      </View>
      <View style={[styles.verdictPill, { backgroundColor: verdict.color + '18' }]}>
        <View style={[styles.verdictDot, { backgroundColor: verdict.color }]} />
        <Text style={[styles.verdictText, { color: verdict.color }]}>{verdict.label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 14,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    width: 248,
    height: 248,
    borderRadius: 999,
    backgroundColor: '#050A10',
    borderWidth: 1,
    borderColor: tradnexTheme.borderStrong,
    ...tradnexShadow,
  },
  glow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(10,132,255,0.05)',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    gap: 2,
  },
  eyebrow: {
    color: tradnexTheme.textMuted,
    fontSize: 11,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 2,
  },
  value: {
    fontSize: 58,
    fontWeight: '800' as const,
  },
  outOf: {
    color: tradnexTheme.textMuted,
    fontSize: 14,
    fontWeight: '600' as const,
    marginTop: -4,
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
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  verdictText: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
});
