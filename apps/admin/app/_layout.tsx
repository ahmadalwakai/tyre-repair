import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Sentry from '@sentry/react-native';
import { SessionProvider } from '@/components/auth/SessionProvider';
import { NotificationProvider } from '@/context/NotificationProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { SoundPrefsProvider } from '@/lib/sound/SoundPrefsProvider';
import { InAppNotificationBanner } from '@/components/notifications/InAppNotificationBanner';
import { IncomingCallQuickBookingPopup } from '@/components/quick-booking/IncomingCallQuickBookingPopup';
import { EmergencyAssistPopup } from '@/components/emergency/EmergencyAssistPopup';
import { NewBookingPopup } from '@/components/booking/NewBookingPopup';
import { OfflineOutboxBanner } from '@/components/system/OfflineOutboxBanner';
import { OtaUpdateBanner } from '@/components/system/OtaUpdateBanner';
import { OfflineStatusPopup } from '@/components/system/OfflineStatusPopup';
import { ScreenErrorBoundary } from '@/components/system/ScreenErrorBoundary';
import { RootErrorBoundary } from '@/components/system/RootErrorBoundary';
import { QueryProvider } from '@/lib/query/QueryProvider';
import '../global.css';

const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

function RootLayout(): React.JSX.Element {
  return (
    <View style={{ flex: 1, backgroundColor: '#0B0B0F' }}>
      <RootErrorBoundary>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0B0B0F' }}>
          <SafeAreaProvider>
            <QueryProvider>
              <SessionProvider>
                <NotificationProvider>
                  <SoundPrefsProvider>
                    <ToastProvider>
                      <StatusBar style="light" />
                      <View style={{ flex: 1, backgroundColor: '#0B0B0F' }}>
                        <ScreenErrorBoundary>
                          <Stack
                            screenOptions={{
                              headerShown: false,
                              contentStyle: { backgroundColor: '#0B0B0F' },
                            }}
                          />
                        </ScreenErrorBoundary>
                        <InAppNotificationBanner />
                        <OfflineOutboxBanner />
                        <OtaUpdateBanner />
                        <IncomingCallQuickBookingPopup />
                        <EmergencyAssistPopup />
                        <NewBookingPopup />
                        <OfflineStatusPopup />
                      </View>
                    </ToastProvider>
                  </SoundPrefsProvider>
                </NotificationProvider>
              </SessionProvider>
            </QueryProvider>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </RootErrorBoundary>
    </View>
  );
}

export default sentryDsn ? Sentry.wrap(RootLayout) : RootLayout;
