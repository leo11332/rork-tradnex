import { Tabs } from 'expo-router';
import { Activity, BookOpen, BrainCircuit, Gauge, Settings2 } from 'lucide-react-native';
import React from 'react';

import { tradnexTheme } from '@/constants/tradnex-theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tradnexTheme.white,
        tabBarInactiveTintColor: tradnexTheme.textMuted,
        tabBarStyle: {
          backgroundColor: '#050507',
          borderTopColor: 'rgba(255,255,255,0.08)',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700' as const,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'En direct',
          tabBarIcon: ({ color, size }) => <Activity color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="score"
        options={{
          title: 'Score',
          tabBarIcon: ({ color, size }) => <Gauge color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Journal',
          tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color, size }) => <BrainCircuit color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'R\u00e9glages',
          tabBarIcon: ({ color, size }) => <Settings2 color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
