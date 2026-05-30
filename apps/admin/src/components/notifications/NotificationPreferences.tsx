import React from 'react';
import { View, Text, Switch, Pressable } from 'react-native';
import { GoldCard } from '@/components/ui/GoldCard';
import { useNotifications } from '@/context/NotificationProvider';
import { NotificationPermissionCard } from './NotificationPermissionCard';
import { NotificationTestPanel } from './NotificationTestPanel';
import type { AdminNotificationPreferenceState } from '@/lib/notifications/types';

const PREF_LABELS: Array<{ key: keyof AdminNotificationPreferenceState; label: string; hint?: string }> = [
  { key: 'pushEnabled', label: 'Push notifications', hint: 'Master switch for all alerts.' },
  { key: 'soundEnabled', label: 'Alert sound', hint: 'Plays the bundled alert sound.' },
  { key: 'bookingAlertsEnabled', label: 'Bookings & payments' },
  { key: 'stockAlertsEnabled', label: 'Stock alerts' },
  { key: 'pricingAlertsEnabled', label: 'Pricing changes' },
  { key: 'visitorAlertsEnabled', label: 'Visitor activity (off by default)' },
];

export function NotificationPreferences(): React.JSX.Element {
  const { preferences, loadingPreferences, preferencesError, updatePreference } = useNotifications();

  return (
    <View style={{ gap: 12 }}>
      <NotificationPermissionCard />
      <GoldCard>
        <Text className="text-text font-semibold mb-3">Alert categories</Text>
        {preferencesError ? (
          <Text className="text-red-400 text-xs mb-2">{preferencesError}</Text>
        ) : null}
        {PREF_LABELS.map((p) => {
          const disabled = loadingPreferences || (p.key !== 'pushEnabled' && !preferences.pushEnabled);
          const value = preferences[p.key];
          const toggle = (): void => {
            if (disabled) return;
            void updatePreference(p.key, !value);
          };
          return (
            <Pressable
              key={p.key}
              onPress={toggle}
              disabled={disabled}
              accessibilityRole="switch"
              accessibilityState={{ checked: value, disabled }}
              accessibilityLabel={p.label}
              android_ripple={{ color: 'rgba(212,175,55,0.10)' }}
              className="flex-row items-center justify-between py-2 border-b border-border"
              style={{ opacity: disabled ? 0.55 : 1 }}
            >
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text className="text-text">{p.label}</Text>
                {p.hint ? <Text className="text-text-muted text-[11px] mt-0.5">{p.hint}</Text> : null}
              </View>
              <Switch
                disabled={disabled}
                value={value}
                onValueChange={(v) => void updatePreference(p.key, v)}
                trackColor={{ false: '#2A2A33', true: '#8F0010' }}
                thumbColor={value ? '#E30613' : '#6B6B75'}
              />
            </Pressable>
          );
        })}
      </GoldCard>
      <NotificationTestPanel />
    </View>
  );
}
