import React, { useEffect } from 'react';
import { Tabs, router } from 'expo-router';
import { useSession } from '@/components/auth/SessionProvider';
import { playSound } from '@/lib/sound/play-sound';
import { FloatingTabBar } from '@/components/navigation/FloatingTabBar';

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

  useEffect(() => {
    if (!isLoading && !admin) {
      router.replace('/login');
    }
  }, [isLoading, admin]);

  if (isLoading || !admin) return null;

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenListeners={{
        tabPress: () => {
          void playSound('screen_change', { volume: 0.35 });
        },
      }}
      screenOptions={{
        headerShown: false,
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
