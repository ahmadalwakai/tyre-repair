import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppShell } from '@/components/layout/AppShell';
import { GoldButton } from '@/components/ui/GoldButton';
import { GoldCard } from '@/components/ui/GoldCard';
import { GoldInput } from '@/components/ui/GoldInput';
import { resetPassword } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';

export default function ResetPasswordScreen(): React.JSX.Element {
  const params = useLocalSearchParams<{ token?: string }>();
  const [token, setToken] = useState<string>(params.token ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (): Promise<void> => {
    setError(null);
    if (newPassword.length < 12) {
      setError('Password must be at least 12 characters');
      return;
    }
    if (newPassword !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (!token.trim()) {
      setError('Reset token is required');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token.trim(), newPassword);
      setSuccess(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AppShell>
        <View className="flex-1 px-5 justify-center">
          <GoldCard>
            <Text className="text-text text-lg font-semibold mb-2">Password updated</Text>
            <Text className="text-text-muted mb-4">You can now sign in with your new password.</Text>
            <GoldButton label="Go to sign in" onPress={() => router.replace('/login')} />
          </GoldCard>
        </View>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <View className="flex-1 px-5 justify-center">
        <Text className="text-text text-2xl font-bold mb-4">Set new password</Text>
        <GoldCard>
          <View className="gap-3">
            <GoldInput
              label="Reset token"
              value={token}
              onChangeText={setToken}
              placeholder="paste token from email"
              autoCapitalize="none"
            />
            <GoldInput
              label="New password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="min 12 characters"
            />
            <GoldInput
              label="Confirm password"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
            />
            {error ? <Text className="text-danger text-sm">{error}</Text> : null}
            <GoldButton label="Set password" onPress={handleSubmit} loading={loading} />
            <GoldButton label="Cancel" variant="secondary" onPress={() => router.replace('/login')} />
          </View>
        </GoldCard>
      </View>
    </AppShell>
  );
}
