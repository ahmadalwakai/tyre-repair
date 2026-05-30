import React, { useCallback, useEffect, useState } from 'react';
import { Linking, RefreshControl, ScrollView, Switch, View, Text } from 'react-native';
import { AppShell, ScreenHeader } from '@/components/layout/AppShell';
import { AdminButton } from '@/components/ui/AdminButton';
import { GoldCard } from '@/components/ui/GoldCard';
import { GoldInput } from '@/components/ui/GoldInput';
import { ErrorState } from '@/components/ui/States';
import { SkeletonCardList } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useSoundPrefs } from '@/lib/sound/SoundPrefsProvider';
import { playSound } from '@/lib/sound/play-sound';
import { useSession } from '@/components/auth/SessionProvider';
import { getProfile, patchProfile } from '@/lib/api/settings';
import type { AdminProfile } from '@/types/auth';
import { ApiError } from '@/lib/api/client';
import { NotificationPreferences } from '@/components/notifications/NotificationPreferences';
import { BackupRestorePanel } from '@/components/settings/BackupRestorePanel';

export default function SettingsScreen(): React.JSX.Element {
  const { signOut } = useSession();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const { uiFeedbackEnabled, setUiFeedbackEnabled } = useSoundPrefs();

  const load = useCallback(async () => {
    setError(null);
    try {
      const p = await getProfile();
      setProfile(p.profile);
      setFullName(p.profile.fullName);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveProfile = async (): Promise<void> => {
    setSaving(true);
    try {
      const res = await patchProfile(fullName.trim());
      setProfile(res.profile);
      toast.success('Profile saved');
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Could not save profile';
      toast.error(msg);
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <ScreenHeader title="Settings" />
        <SkeletonCardList count={2} />
      </AppShell>
    );
  }
  if (error || !profile) {
    return (
      <AppShell>
        <ScreenHeader title="Settings" />
        <ErrorState message={error ?? 'Empty'} onRetry={load} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <ScreenHeader title="Settings" subtitle={profile.email} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load().finally(() => setRefreshing(false));
            }}
            tintColor="#E30613"
          />
        }
      >
        <GoldCard>
          <Text className="text-text font-semibold mb-3">Profile</Text>
          <GoldInput label="Full name" value={fullName} onChangeText={setFullName} />
          <View className="h-3" />
          <Text className="text-text-muted text-sm">Role: {profile.role}</Text>
          <View className="h-3" />
          <AdminButton
            label="Save profile"
            loadingLabel="Saving…"
            variant="primary"
            size="md"
            fullWidth
            onPress={saveProfile}
            loading={saving}
          />
        </GoldCard>

        <NotificationPreferences />

        <BackupRestorePanel />

        <GoldCard>
          <Text className="text-text font-semibold mb-1">UI feedback sounds</Text>
          <Text className="text-text-muted text-xs mb-3">
            Soft tones when toasts appear and after key actions. Critical
            alerts (incoming call, emergency assist) are controlled separately
            in the Notifications section above.
          </Text>
          <View className="flex-row items-center justify-between">
            <Text className="text-text">Enable UI sounds</Text>
            <Switch
              value={uiFeedbackEnabled}
              onValueChange={(next) => {
                void setUiFeedbackEnabled(next).then(() => {
                  if (next) void playSound('toast_success', { volume: 0.5 });
                });
              }}
              trackColor={{ true: '#E30613', false: '#2A2A33' }}
              thumbColor={uiFeedbackEnabled ? '#F01825' : '#6B6B75'}
            />
          </View>
        </GoldCard>

        <GoldCard>
          <AdminButton
            label="Sign out"
            variant="danger"
            size="md"
            fullWidth
            onPress={() => void signOut()}
          />
        </GoldCard>

        <View className="items-center mt-4 mb-2 px-4">
          <Text className="text-text-dim text-[11px] text-center">
            Made with Love by Mr Ahmad Alwakai
          </Text>
          <Text className="text-text-dim text-[11px] text-center">
            Lead developer of{' '}
            <Text
              className="text-gold underline"
              onPress={() => void Linking.openURL('https://www.zyphonsystems.com/')}
            >
              zyphonsystems.com
            </Text>
          </Text>
        </View>
      </ScrollView>
    </AppShell>
  );
}
