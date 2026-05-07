import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { AppShell } from '@/components/layout/AppShell';
import { GoldButton } from '@/components/ui/GoldButton';
import { GoldCard } from '@/components/ui/GoldCard';
import { GoldInput } from '@/components/ui/GoldInput';
import { forgotPassword } from '@/lib/api/auth';

export default function ForgotPasswordScreen(): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (): Promise<void> => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await forgotPassword(email.trim().toLowerCase());
      setMessage(res.message);
    } catch {
      setMessage('If the email is valid, a reset link has been sent.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <View className="flex-1 px-5 justify-center">
        <Text className="text-text text-2xl font-bold mb-4">Reset password</Text>
        <GoldCard>
          <View className="gap-3">
            <GoldInput
              label="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholder="admin@tyrerepair.uk"
            />
            {message ? <Text className="text-text-muted text-sm">{message}</Text> : null}
            <GoldButton label="Send reset link" onPress={handleSubmit} loading={loading} />
            <GoldButton label="Back to login" variant="secondary" onPress={() => router.replace('/login')} />
          </View>
        </GoldCard>
      </View>
    </AppShell>
  );
}
