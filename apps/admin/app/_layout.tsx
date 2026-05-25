import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { SessionProvider } from '@/components/auth/SessionProvider';
import { NotificationProvider } from '@/context/NotificationProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { SoundPrefsProvider } from '@/lib/sound/SoundPrefsProvider';
import { InAppNotificationBanner } from '@/components/notifications/InAppNotificationBanner';
import { IncomingCallQuickBookingPopup } from '@/components/quick-booking/IncomingCallQuickBookingPopup';
import { EmergencyAssistPopup } from '@/components/emergency/EmergencyAssistPopup';
import { NewBookingPopup } from '@/components/booking/NewBookingPopup';
import { OfflineOutboxBanner } from '@/components/system/OfflineOutboxBanner';
import '../global.css';

export default function RootLayout(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0B0B0F' }}>
      <SafeAreaProvider>
        <SessionProvider>
          <NotificationProvider>
            <SoundPrefsProvider>
              <ToastProvider>
                <StatusBar style="light" />
                <View style={{ flex: 1 }}>
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { backgroundColor: '#0B0B0F' },
                    }}
                  />
                  <InAppNotificationBanner />
                  <OfflineOutboxBanner />
                  <IncomingCallQuickBookingPopup />
                  <EmergencyAssistPopup />
                  <NewBookingPopup />
                </View>
              </ToastProvider>
            </SoundPrefsProvider>
          </NotificationProvider>
        </SessionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
