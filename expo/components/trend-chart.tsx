import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Line, LinearGradient as SvgLinearGradient, Polyline, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { tradnexTheme } from '@/constants/tradnex-theme';

export interface ChartPoint {
  label: string;
  value: number;
  dayOfWeek?: number;
}

type GradientType = 'stress' | 'positive' | 'none';

function getStressTrendBarColor(value: number, maxValue: number): string {
  const ratio = maxValue > 0 ? value / maxValue : 0;
  if (ratio <= 0.33) return '#00C48C';
  if (ratio <= 0.66) return '#FF9500';
  return '#FF3B30';
}

function getPositiveBarColor(value: number, maxValue: number): string {
  const ratio = maxValue > 0 ? value / maxValue : 0;
  if (ratio <= 0.3) return '#FF9500';
  if (ratio <= 0.6) return '#00C48C';
  return '#34D399';
}

interface TrendChartProps {
  title: string;
  subtitle: string;
  color: string;
  data: ChartPoint[];
  variant: 'line' | 'bar';
  testID: string;
  bgColor?: string;
  gradientType?: GradientType;
}

export function TrendChart({ title, subtitle, color, data, variant, testID, bgColor, gradientType = 'none' }: TrendChartProps) {
  const width = 320;
  const height = 164;
  const leftPadding = 38;
  const padding = 14;
  const chartLeft = leftPadding;
  const chartRight = width - padding;
  const chartWidth = chartRight - chartLeft;
  const chartTop = padding;
  const chartBottom = height - padding;
  const chartHeight = chartBottom - chartTop;
  const values = data.map((item) => item.value);
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const normalizedRange = maxValue - minValue || 1;

  const yAxisTicks = useMemo(() => {
    const ticks: number[] = [];
    const step = normalizedRange / 4;
    for (let i = 0; i <= 4; i++) {
      ticks.push(Math.round(minValue + step * i));
    }
    return ticks;
  }, [minValue, normalizedRange]);

  const points = useMemo(() => {
    const barPadding = variant === 'bar' ? 12 : 0;
    const usableWidth = chartWidth - barPadding * 2;
    return data.map((item, index) => {
      const x = chartLeft + barPadding + (index / Math.max(data.length - 1, 1)) * usableWidth;
      const y = chartBottom - ((item.value - minValue) / normalizedRange) * chartHeight;
      return { x, y, label: item.label, value: item.value };
    });
  }, [data, chartLeft, chartWidth, chartBottom, chartHeight, minValue, normalizedRange, variant]);

  return (
    <View style={[styles.card, bgColor ? { backgroundColor: bgColor } : undefined]} testID={testID}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {yAxisTicks.map((tick, i) => {
          const y = chartBottom - ((tick - minValue) / normalizedRange) * chartHeight;
          return (
            <React.Fragment key={`tick-${i}`}>
              <Line x1={chartLeft} y1={y} x2={chartRight} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
              <SvgText x={chartLeft - 6} y={y + 4} fill="rgba(255,255,255,0.35)" fontSize="10" textAnchor="end">{tick}</SvgText>
            </React.Fragment>
          );
        })}
        {variant === 'line' ? (
          <Polyline
            points={points.map((point) => `${point.x},${point.y}`).join(' ')}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : (
          points.map((point, index) => {
            const maxBarWidth = 18;
            const spacing = 2;
            const availablePerBar = data.length > 1 ? chartWidth / data.length : maxBarWidth + spacing;
            const barWidth = Math.min(maxBarWidth, Math.max(3, availablePerBar - spacing));
            const radius = Math.min(8, barWidth / 2);
            const barHeight = chartBottom - point.y;

            let topColor = color;
            if (gradientType === 'stress') {
              topColor = getStressTrendBarColor(point.value, maxValue);
            } else if (gradientType === 'positive') {
              topColor = getPositiveBarColor(point.value, maxValue);
            }

            const gradId = `trendGrad-${index}`;
            return (
              <React.Fragment key={`${point.label}-${index}`}>
                <Defs>
                  <SvgLinearGradient id={gradId} x1="0" y1="1" x2="0" y2="0">
                    <Stop offset="0" stopColor={topColor} stopOpacity="0.1" />
                    <Stop offset="0.5" stopColor={topColor} stopOpacity="0.55" />
                    <Stop offset="1" stopColor={topColor} stopOpacity="1" />
                  </SvgLinearGradient>
                </Defs>
                <Rect
                  x={point.x - barWidth / 2}
                  y={point.y}
                  width={barWidth}
                  height={barHeight}
                  rx={radius}
                  fill={`url(#${gradId})`}
                />
              </React.Fragment>
            );
          })
        )}
      </Svg>
      <View style={[styles.labels, { paddingLeft: leftPadding - padding }]}>
        {(() => {
          const step = data.length <= 10 ? 1 : Math.ceil(data.length / 8);
          return data.map((item, index) => {
            const show = index % step === 0 || index === data.length - 1;
            if (!show) return <View key={`spacer-${index}`} style={styles.labelSpacer} />;
            const dayMatch = item.label.match(/(\d+)/);
            const dayNum = dayMatch ? dayMatch[1] : item.label;
            return (
              <Text key={`${item.label}-${index}`} style={styles.label} numberOfLines={1}>
                {dayNum}
              </Text>
            );
          });
        })()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 26,
    backgroundColor: tradnexTheme.surface,
    borderWidth: 1,
    borderColor: tradnexTheme.border,
    padding: 18,
    gap: 14,
  },
  header: {
    gap: 4,
  },
  title: {
    color: tradnexTheme.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    color: tradnexTheme.textSecondary,
    fontSize: 13,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  label: {
    flex: 1,
    color: tradnexTheme.textMuted,
    fontSize: 10,
    textAlign: 'center',
  },
  labelSpacer: {
    flex: 1,
  },
});
