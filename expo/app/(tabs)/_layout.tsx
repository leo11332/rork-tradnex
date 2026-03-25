import { Tabs } from 'expo-router';
import { Bell, BarChart3, Activity, Settings2 } from 'lucide-react-native';
import React from 'react';

import { tradnexTheme } from '@/constants/tradnex-theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tradnexTheme.accent,
        tabBarInactiveTintColor: tradnexTheme.textMuted,
        tabBarStyle: {
          backgroundColor: '#0D0D0F',
          borderTopColor: 'rgba(255,255,255,0.04)',
          borderTopWidth: 0.5,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500' as const,
          letterSpacing: 0.3,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Score',
          tabBarIcon: ({ color, size }) => <Activity color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Historique',
          tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alertes',
          tabBarIcon: ({ color, size }) => <Bell color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Réglages',
          tabBarIcon: ({ color, size }) => <Settings2 color={color} size={size - 2} />,
        }}
      />
    </Tabs>
  );
}
