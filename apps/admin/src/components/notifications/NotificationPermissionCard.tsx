import React, { useState } from 'react';
import { Linking, View, Text } from 'react-native';
import { GoldButton } from '@/components/ui/GoldButton';
import { GoldCard } from '@/components/ui/GoldCard';
import { useNotifications } from '@/context/NotificationProvider';

export function NotificationPermissionCard(): React.JSX.Element {
  const { permission, registration, requestPermission, registerDevice } = useNotifications();
  const [working, setWorking] = useState(false);

  const status = permission?.status ?? 'undetermined';
  const isGranted = status === 'granted';
  const cannotAsk = status === 'denied' && permission?.canAskAgain === false;
  const isRegistered = registration.state === 'registered';

  const handleEnable = async (): Promise<void> => {
    setWorking(true);
    try {
      const next = await requestPermission();
      if (next.status === 'granted') {
        await registerDevice();
      }
    } finally {
      setWorking(false);
    }
  };

  const handleRegister = async (): Promise<void> => {
    setWorking(true);
    try {
      await registerDevice();
    } finally {
      setWorking(false);
    }
  };

  return (
    <GoldCard>
      <Text className="text-text font-semibold mb-2">Device alerts</Text>
      <Text className="text-text-muted text-sm mb-3">
        Enable Android notifications to receive emergency bookings, payments and low-stock alerts on
        this device — even when the app is killed.
      </Text>
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-text-muted text-xs">Permission</Text>
        <Text className={isGranted ? 'text-gold text-xs font-semibold' : 'text-red-400 text-xs font-semibold'}>
          {status.toUpperCase()}
        </Text>
      </View>
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-text-muted text-xs">Device registered</Text>
        <Text className={isRegistered ? 'text-gold text-xs font-semibold' : 'text-text-muted text-xs'}>
          {isRegistered ? 'YES' : 'NO'}
        </Text>
      </View>
      {!isGranted && !cannotAsk ? (
        <GoldButton label="Enable notifications" onPress={handleEnable} loading={working} />
      ) : null}
      {cannotAsk ? (
        <GoldButton
          label="Open Android settings"
          variant="secondary"
          onPress={() => void Linking.openSettings()}
        />
      ) : null}
      {isGranted && !isRegistered ? (
        <GoldButton label="Register this device" onPress={handleRegister} loading={working} />
      ) : null}
      {registration.state === 'unsupported' ? (
        <Text className="text-red-400 text-xs mt-2">
          Push registration unavailable: {registration.reason}.
        </Text>
      ) : null}
      {registration.state === 'error' ? (
        <Text className="text-red-400 text-xs mt-2">Registration failed: {registration.message}</Text>
      ) : null}
      <Text className="text-text-muted text-[11px] mt-3">
        For killed-app alerts, keep Android notifications enabled for this app and disable battery
        restriction (Settings → Apps → Battery → Unrestricted) for best reliability.
      </Text>
    </GoldCard>
  );
}
