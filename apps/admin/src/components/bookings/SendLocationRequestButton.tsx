import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { GoldButton } from '@/components/ui/GoldButton';
import { useToast } from '@/components/ui/Toast';
import { useSingleFlightAction } from '@/hooks/useSingleFlightAction';
import { sendLocationRequest } from '@/lib/api/admin-efficiency';
import { ApiError } from '@/lib/api/client';

/**
 * Admin Efficiency Pack F13 — Re-send "share location" link to customer.
 */
export function SendLocationRequestButton({
  bookingId,
  hasGpsLocation,
  onSent,
}: {
  bookingId: string;
  hasGpsLocation: boolean;
  onSent?: () => void;
}): React.JSX.Element {
  const [lastSentAt, setLastSentAt] = useState<string | null>(null);
  const toast = useToast();

  const action = useSingleFlightAction(async () => sendLocationRequest(bookingId));

  const submit = async (): Promise<void> => {
    try {
      const r = await action.run();
      if (!r) {
        if (action.error) toast.error(action.error);
        return;
      }
      setLastSentAt(new Date().toISOString());
      toast.success(
        r.smsSent
          ? `Location SMS sent · expires in ${r.expiresInMinutes}m`
          : `Link generated · expires in ${r.expiresInMinutes}m`,
      );
      onSent?.();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not send link');
    }
  };

  return (
    <View>
      <GoldButton
        label={hasGpsLocation ? 'Re-send location link' : 'Send location link'}
        variant={hasGpsLocation ? 'secondary' : 'primary'}
        onPress={() => void submit()}
        loading={action.isPending}
      />
      {lastSentAt ? (
        <Text className="text-text-dim text-[10px] mt-1 text-center">
          Sent at {new Date(lastSentAt).toLocaleTimeString()}
        </Text>
      ) : null}
    </View>
  );
}
