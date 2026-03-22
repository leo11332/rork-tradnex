import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppErrorBoundary } from '@/components/error-boundary';
import { AuthProvider } from '@/providers/auth-provider';
import { TradnexProvider } from '@/providers/tradnex-provider';
import { setupGlobalErrorHandler } from '@/services/crash-reporter';
import {
  addNotificationResponseListener,
  registerForPushNotifications,
} from '@/services/notifications';

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'Retour' }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="health-permissions" options={{ headerShown: false }} />
      <Stack.Screen name="paywall" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="legal" options={{ presentation: 'modal', headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const notificationResponseListener = useRef<ReturnType<typeof addNotificationResponseListener> | null>(null);

  useEffect(() => {
    void SplashScreen.hideAsync();
    setupGlobalErrorHandler();

    if (Platform.OS !== 'web') {
      void registerForPushNotifications();
    }

    if (Platform.OS !== 'web') {
      notificationResponseListener.current = addNotificationResponseListener((response) => {
        const data = response.notification.request.content.data as Record<string, unknown> | undefined;
        console.log('[layout] notification tapped, data:', data);

        if (data?.screen && typeof data.screen === 'string') {
          setTimeout(() => {
            router.push(data.screen as never);
          }, 500);
        }
      });
    }

    return () => {
      if (notificationResponseListener.current) {
        notificationResponseListener.current.remove();
      }
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TradnexProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <AppErrorBoundary>
              <RootLayoutNav />
            </AppErrorBoundary>
          </GestureHandlerRootView>
        </TradnexProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
