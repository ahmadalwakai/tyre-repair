import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { LoadingState } from '@/components/ui/States';
import { useSession } from '@/components/auth/SessionProvider';
import { hasSeenPermissionsOnboarding } from '@/lib/permissions/onboarding-flag';

export default function Index(): React.JSX.Element {
  const { isLoading, admin } = useSession();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const seen = await hasSeenPermissionsOnboarding();
      if (cancelled) return;
      setNeedsOnboarding(!seen);
      setOnboardingChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isLoading || !onboardingChecked) return;
    if (admin) {
      router.replace('/(tabs)/today');
      return;
    }
    if (needsOnboarding) {
      router.replace('/permissions-onboarding');
    } else {
      router.replace('/login');
    }
  }, [isLoading, admin, onboardingChecked, needsOnboarding]);

  return (
    <View style={{ flex: 1, backgroundColor: '#0B0B0F' }}>
      <LoadingState label="Loading..." />
    </View>
  );
}
