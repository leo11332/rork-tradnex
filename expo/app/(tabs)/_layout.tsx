import { Tabs } from 'expo-router';
import { Bell, BarChart3, Gauge, Settings2 } from 'lucide-react-native';
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
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Score',
          tabBarIcon: ({ color, size }) => <Gauge color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Historique',
          tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alertes',
          tabBarIcon: ({ color, size }) => <Bell color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'R\u00E9glages',
          tabBarIcon: ({ color, size }) => <Settings2 color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
