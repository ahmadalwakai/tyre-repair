import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View, ActivityIndicator } from 'react-native';
import { AppShell, ScreenHeader } from '@/components/layout/AppShell';
import { OfflineBanner } from '@/components/system/OfflineBanner';
import { AdminButton } from '@/components/ui/AdminButton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { useToast } from '@/components/ui/Toast';
import { useSession } from '@/components/auth/SessionProvider';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { apiBaseUrl } from '@/lib/api/client';
import {
  fetchAdminDiagnostics,
  sendTestAdminNotification,
  type AdminDiagnosticsResponse,
} from '@/lib/api/diagnostics';
import { playSound } from '@/lib/sound/play-sound';
import { useNotifications } from '@/context/NotificationProvider';

/**
 * Admin Stability & Field Operations Pack — Part 1
 *
 * Diagnostics screen. Helps a non-technical admin/owner understand WHY
 * popups, sound, push or realtime are not working, without exposing any
 * secret values.
 */

interface PingResult {
  ok: boolean;
  status: number | null;
  durationMs: number;
  at: number;
  message?: string;
}

function StatusRow({ label, ok, hint }: { label: string; ok: boolean; hint?: string | undefined }): React.JSX.Element {
  return (
    <View className="flex-row items-center justify-between py-2">
      <View className="flex-1 pr-3">
        <Text className="text-text text-sm">{label}</Text>
        {hint ? <Text className="text-text-muted text-xs mt-0.5">{hint}</Text> : null}
      </View>
      <StatusBadge tone={ok ? 'success' : 'danger'} label={ok ? 'OK' : 'Missing'} />
    </View>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <AnimatedCard>
      <View className="bg-surface rounded-xl border border-border p-4 mb-3">
        <Text className="text-text font-semibold text-base mb-2">{title}</Text>
        {children}
      </View>
    </AnimatedCard>
  );
}

export default function DiagnosticsScreen(): React.JSX.Element {
  const { admin, refresh } = useSession();
  const { online, lastCheckedAt } = useNetworkStatus();
  const toast = useToast();
  const {
    incomingLeads,
    activeLead,
    queueCount,
    lastLeadReceivedAt,
    lastLeadSoundAt,
    lastPopupShownAt,
    lastRealtimeEventName,
  } = useNotifications();

  const [data, setData] = useState<AdminDiagnosticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [pingResult, setPingResult] = useState<PingResult | null>(null);
  const [testingNotif, setTestingNotif] = useState(false);
  const [playingSound, setPlayingSound] = useState(false);

  const apiBaseShort = apiBaseUrl.length > 48 ? `${apiBaseUrl.slice(0, 48)}…` : apiBaseUrl;

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await fetchAdminDiagnostics();
      setData(res);
    } catch (err) {
      toast.show(
        err instanceof Error ? err.message : 'Could not load diagnostics',
        'error',
      );
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const testApi = useCallback(async (): Promise<void> => {
    const started = Date.now();
    try {
      const res = await fetch(`${apiBaseUrl}/api/health`, { method: 'GET' });
      setPingResult({
        ok: res.ok,
        status: res.status,
        durationMs: Date.now() - started,
        at: Date.now(),
      });
    } catch (err) {
      setPingResult({
        ok: false,
        status: null,
        durationMs: Date.now() - started,
        at: Date.now(),
        message: err instanceof Error ? err.message : 'Network error',
      });
    }
  }, []);

  const sendTestNotif = useCallback(async (): Promise<void> => {
    setTestingNotif(true);
    try {
      const res = await sendTestAdminNotification();
      const message =
        res.sent > 0
          ? `Sent ${res.sent} of ${res.attempted} test notification(s).`
          : 'No registered devices to send to.';
      toast.show(message, res.sent > 0 ? 'success' : 'warning');
    } catch (err) {
      toast.show(
        err instanceof Error ? err.message : 'Test notification failed',
        'error',
      );
    } finally {
      setTestingNotif(false);
    }
  }, [toast]);

  const playTestSound = useCallback(async (): Promise<void> => {
    setPlayingSound(true);
    try {
      await playSound('urgent_action');
    } finally {
      setPlayingSound(false);
    }
  }, []);

  return (
    <AppShell>
      <OfflineBanner />
      <ScreenHeader title="Admin diagnostics" subtitle="Connection, sound and environment checks" />
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 32 }}>
        {/* 1. API Connection */}
        <Card title="API connection">
          <View className="flex-row items-center justify-between py-2">
            <Text className="text-text text-sm flex-1 pr-3">Base URL</Text>
            <Text className="text-text-muted text-xs">{apiBaseShort}</Text>
          </View>
          <StatusRow label="Network" ok={online} hint={lastCheckedAt ? `Last checked ${new Date(lastCheckedAt).toLocaleTimeString()}` : undefined} />
          {pingResult ? (
            <View className="mt-2 mb-2">
              <Text className="text-text-muted text-xs">
                Last ping: {pingResult.ok ? 'OK' : 'Failed'} • status {pingResult.status ?? '—'} • {pingResult.durationMs}ms •{' '}
                {new Date(pingResult.at).toLocaleTimeString()}
              </Text>
              {pingResult.message ? (
                <Text className="text-danger text-xs mt-1">{pingResult.message}</Text>
              ) : null}
            </View>
          ) : null}
          <AdminButton label="Test API" variant="secondary" size="sm" onPress={testApi} />
        </Card>

        {/* 2. Auth Status */}
        <Card title="Auth status">
          <StatusRow label="Logged in" ok={Boolean(admin)} />
          {admin ? (
            <>
              <View className="flex-row items-center justify-between py-2">
                <Text className="text-text text-sm">Email</Text>
                <Text className="text-text-muted text-xs">{admin.email}</Text>
              </View>
              <View className="flex-row items-center justify-between py-2">
                <Text className="text-text text-sm">Role</Text>
                <StatusBadge tone="info" label={admin.role ?? 'unknown'} />
              </View>
            </>
          ) : null}
          <View className="mt-2">
            <AdminButton label="Refresh session" variant="secondary" size="sm" onPress={() => void refresh()} />
          </View>
        </Card>

        {/* 3. Realtime / Pusher */}
        <Card title="Realtime (Pusher)">
          {data ? (
            <>
              <StatusRow label="Pusher key (server)" ok={data.realtime.pusherKeyPresent} />
              <StatusRow label="Pusher cluster (server)" ok={data.realtime.pusherClusterPresent} />
              <StatusRow label="Pusher app id" ok={data.realtime.pusherAppIdPresent} />
              <StatusRow label="Pusher secret" ok={data.realtime.pusherSecretPresent} />
              <StatusRow label="Public key (client)" ok={data.realtime.publicKeyPresent} />
              <StatusRow label="Public cluster (client)" ok={data.realtime.publicClusterPresent} />
            </>
          ) : (
            <Text className="text-text-muted text-xs">Loading…</Text>
          )}
        </Card>

        {/* 4. Push Notifications */}
        <Card title="Push notifications">
          {data ? (
            <>
              <StatusRow label="Expo access token" ok={data.push.expoAccessTokenPresent} hint="Required for server-side push delivery" />
              <StatusRow label="Default sound configured" ok={data.push.defaultSoundConfigured} />
            </>
          ) : null}
          <View className="mt-2">
            <AdminButton
              label={testingNotif ? 'Sending…' : 'Send test notification'}
              variant="secondary"
              size="sm"
              loading={testingNotif}
              disabled={testingNotif || !online}
              onPress={sendTestNotif}
            />
          </View>
        </Card>

        {/* 5. Sound */}
        <Card title="Sound">
          <Text className="text-text-muted text-xs mb-2">
            Plays the in-app alert sound to verify the asset and audio mode.
          </Text>
          <AdminButton
            label={playingSound ? 'Playing…' : 'Play test sound'}
            variant="secondary"
            size="sm"
            loading={playingSound}
            onPress={playTestSound}
          />
        </Card>

        {/* 5b. Incoming leads queue */}
        <Card title="Incoming leads queue">
          <View className="flex-row items-center justify-between py-1">
            <Text className="text-text text-sm">Queue size</Text>
            <Text className="text-text-muted text-xs">{incomingLeads.length}</Text>
          </View>
          <View className="flex-row items-center justify-between py-1">
            <Text className="text-text text-sm">Active lead</Text>
            <Text className="text-text-muted text-xs">
              {activeLead ? activeLead.type : '—'}
            </Text>
          </View>
          <View className="flex-row items-center justify-between py-1">
            <Text className="text-text text-sm">Waiting in queue</Text>
            <Text className="text-text-muted text-xs">{queueCount}</Text>
          </View>
          <View className="flex-row items-center justify-between py-1">
            <Text className="text-text text-sm">Last lead received</Text>
            <Text className="text-text-muted text-xs">
              {lastLeadReceivedAt ? new Date(lastLeadReceivedAt).toLocaleTimeString() : '—'}
            </Text>
          </View>
          <View className="flex-row items-center justify-between py-1">
            <Text className="text-text text-sm">Last popup shown</Text>
            <Text className="text-text-muted text-xs">
              {lastPopupShownAt ? new Date(lastPopupShownAt).toLocaleTimeString() : '—'}
            </Text>
          </View>
          <View className="flex-row items-center justify-between py-1">
            <Text className="text-text text-sm">Last sound played</Text>
            <Text className="text-text-muted text-xs">
              {lastLeadSoundAt ? new Date(lastLeadSoundAt).toLocaleTimeString() : '—'}
            </Text>
          </View>
          <View className="flex-row items-center justify-between py-1">
            <Text className="text-text text-sm">Last realtime event</Text>
            <Text className="text-text-muted text-xs">{lastRealtimeEventName ?? '—'}</Text>
          </View>
        </Card>

        {/* 6. Environment */}
        <Card title="Environment">
          {data ? (
            <>
              <StatusRow label="ADMIN_JWT_SECRET" ok={data.webEnv.adminJwtSecretPresent} />
              <StatusRow label="NEXT_PUBLIC_SITE_URL" ok={data.webEnv.siteUrlPresent} />
              <StatusRow label="Storage configured" ok={data.storage.configured} hint={`Provider: ${data.storage.provider}`} />
              {data.storage.missing.length > 0 ? (
                <Text className="text-warning text-xs mt-1">
                  Missing: {data.storage.missing.join(', ')}
                </Text>
              ) : null}
            </>
          ) : (
            <Text className="text-text-muted text-xs">Loading…</Text>
          )}
        </Card>

        {/* 7. Server identity */}
        {data ? (
          <Card title="Server identity">
            <View className="flex-row items-center justify-between py-2">
              <Text className="text-text text-sm">Service</Text>
              <Text className="text-text-muted text-xs">{data.service}</Text>
            </View>
            <View className="flex-row items-center justify-between py-2">
              <Text className="text-text text-sm">Version</Text>
              <Text className="text-text-muted text-xs">{data.version}</Text>
            </View>
            <View className="flex-row items-center justify-between py-2">
              <Text className="text-text text-sm">Database</Text>
              <StatusBadge tone={data.database.ok ? 'success' : 'danger'} label={data.database.ok ? 'OK' : 'Down'} />
            </View>
          </Card>
        ) : null}

        <View className="mt-2">
          <AdminButton
            label={loading ? 'Refreshing…' : 'Refresh diagnostics'}
            variant="primary"
            loading={loading}
            disabled={loading}
            onPress={() => void load()}
          />
        </View>

        {loading && !data ? (
          <View className="items-center py-6">
            <ActivityIndicator color="#D4AF37" />
          </View>
        ) : null}
      </ScrollView>
    </AppShell>
  );
}
