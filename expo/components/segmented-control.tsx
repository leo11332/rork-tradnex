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
    flexDirection: 'row',
    borderRadius: 999,
    backgroundColor: tradnexTheme.surfaceMuted,
    padding: 4,
    borderWidth: 1,
    borderColor: tradnexTheme.border,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: tradnexTheme.accent,
  },
  label: {
    color: tradnexTheme.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  labelActive: {
    color: tradnexTheme.white,
  },
});
