import React, { useEffect } from 'react';
import { Tabs, router } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '@/components/auth/SessionProvider';
import { playSound } from '@/lib/sound/play-sound';

/**
 * Bottom tab navigation. Only five primary destinations are visible:
 *   Today · Actions · Bookings · Finance · More
 *
 * All other admin screens (stock, pricing, callbacks, audit, settings…)
 * remain registered as routes so deep links keep working, but are hidden
 * from the tab bar via `href: null`. They are surfaced through the
 * MoreScreen menu and through in-app navigation calls.
 */
export default function TabsLayout(): React.JSX.Element | null {
  const { isLoading, admin } = useSession();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!isLoading && !admin) {
      router.replace('/login');
    }
  }, [isLoading, admin]);

  if (isLoading || !admin) return null;

  // Lift the tab bar above the system gesture/nav area so buttons don't
  // sit flush against the screen edge on Android. Falls back to a sensible
  // minimum on devices that report a 0 inset.
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 8);
  const baseHeight = Platform.OS === 'web' ? 60 : 64;

  return (
    <Tabs
      screenListeners={{
        tabPress: () => {
          void playSound('screen_change', { volume: 0.35 });
        },
      }}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#15151B',
          borderTopColor: '#2A2A33',
          borderTopWidth: 1,
          height: baseHeight + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.2,
        },
        tabBarActiveTintColor: '#D4AF37',
        tabBarInactiveTintColor: '#A0A0A8',
        tabBarAllowFontScaling: false,
      }}
    >
      {/* Visible tabs — exactly five */}
      <Tabs.Screen name="today" options={{ title: 'Today' }} />
      <Tabs.Screen name="action-queue" options={{ title: 'Actions' }} />
      <Tabs.Screen name="bookings" options={{ title: 'Bookings' }} />
      <Tabs.Screen name="finance" options={{ title: 'Finance' }} />
      <Tabs.Screen name="more" options={{ title: 'More' }} />

      {/* Hidden routes — still navigable, surfaced via MoreScreen */}
      <Tabs.Screen name="quick-booking" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="outstanding-balances" options={{ href: null }} />
      <Tabs.Screen name="failed-payments" options={{ href: null }} />
      <Tabs.Screen name="callbacks" options={{ href: null }} />
      <Tabs.Screen name="stock" options={{ href: null }} />
      <Tabs.Screen name="pricing" options={{ href: null }} />
      <Tabs.Screen name="visitors" options={{ href: null }} />
      <Tabs.Screen name="dashboard" options={{ href: null }} />
      <Tabs.Screen name="cash-reconciliation" options={{ href: null }} />
      <Tabs.Screen name="daily-close" options={{ href: null }} />
      <Tabs.Screen name="audit" options={{ href: null }} />
      <Tabs.Screen name="operational-settings" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
