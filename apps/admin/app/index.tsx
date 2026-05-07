import React, { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { LoadingState } from '@/components/ui/States';
import { useSession } from '@/components/auth/SessionProvider';

export default function Index(): React.JSX.Element {
  const { isLoading, admin } = useSession();

  useEffect(() => {
    if (isLoading) return;
    if (admin) {
      router.replace('/(tabs)/today');
    } else {
      router.replace('/login');
    }
  }, [isLoading, admin]);

  return (
    <View className="flex-1 bg-canvas">
      <LoadingState label="Loading..." />
    </View>
  );
}
