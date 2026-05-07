import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { GoldButton } from '@/components/ui/GoldButton';
import { GoldCard } from '@/components/ui/GoldCard';
import { useNotifications } from '@/context/NotificationProvider';

type Kind = 'booking' | 'stock' | 'pricing';

export function NotificationTestPanel(): React.JSX.Element {
  const { sendTest } = useNotifications();
  const [busy, setBusy] = useState<Kind | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const run = async (kind: Kind): Promise<void> => {
    setBusy(kind);
    setResult(null);
    try {
      const r = await sendTest(kind);
      if (r.ok) setResult(`Sent test "${kind}" to ${r.sent} device(s).`);
      else setResult(r.message ?? 'Test failed.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <GoldCard>
      <Text className="text-text font-semibold mb-2">Test notifications</Text>
      <Text className="text-text-muted text-xs mb-3">
        Sends a real Expo push to your registered devices.
      </Text>
      <View className="flex-row gap-2 flex-wrap">
        <View className="flex-1 min-w-[120px]">
          <GoldButton
            label="Booking"
            onPress={() => void run('booking')}
            loading={busy === 'booking'}
          />
        </View>
        <View className="flex-1 min-w-[120px]">
          <GoldButton
            label="Stock"
            variant="secondary"
            onPress={() => void run('stock')}
            loading={busy === 'stock'}
          />
        </View>
        <View className="flex-1 min-w-[120px]">
          <GoldButton
            label="Pricing"
            variant="secondary"
            onPress={() => void run('pricing')}
            loading={busy === 'pricing'}
          />
        </View>
      </View>
      {result ? <Text className="text-text-muted text-xs mt-3">{result}</Text> : null}
    </GoldCard>
  );
}
