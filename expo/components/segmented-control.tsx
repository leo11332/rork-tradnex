import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { tradnexTheme } from '@/constants/tradnex-theme';

export interface SegmentOption<T extends string> {
  label: string;
  value: T;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  testID: string;
}

export function SegmentedControl<T extends string>({ options, value, onChange, testID }: SegmentedControlProps<T>) {
  return (
    <View style={styles.container} testID={testID}>
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.segment, isActive ? styles.segmentActive : undefined]}
            testID={`${testID}-${option.value}`}
          >
            <Text style={[styles.label, isActive ? styles.labelActive : undefined]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row' as const,
    borderRadius: 12,
    backgroundColor: tradnexTheme.surface,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center' as const,
  },
  segmentActive: {
    backgroundColor: tradnexTheme.surfaceElevated,
  },
  label: {
    color: tradnexTheme.textMuted,
    fontSize: 13,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  },
  labelActive: {
    color: tradnexTheme.white,
  },
});
