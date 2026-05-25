import React, { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AppShell, ScreenHeader } from '@/components/layout/AppShell';
import { OfflineBanner } from '@/components/system/OfflineBanner';
import { AdminButton } from '@/components/ui/AdminButton';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { StatusBadge, type StatusBadgeTone } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { useNotifications } from '@/context/NotificationProvider';
import { getLeadDisplayCopy } from '@/lib/incoming-leads/lead-queue';
import type { IncomingLead, IncomingLeadStatus, IncomingLeadType } from '@/types/incoming-leads';

const STATUS_LABEL: Record<IncomingLeadStatus, string> = {
  NEW: 'New',
  VIEWED: 'Viewed',
  IN_PROGRESS: 'In progress',
  HANDLED: 'Handled',
  DISMISSED: 'Dismissed',
  EXPIRED: 'Expired',
};

const STATUS_TONE: Record<IncomingLeadStatus, StatusBadgeTone> = {
  NEW: 'warning',
  VIEWED: 'info',
  IN_PROGRESS: 'medium',
  HANDLED: 'success',
  DISMISSED: 'muted',
  EXPIRED: 'muted',
};

const TYPE_LABEL: Record<IncomingLeadType, string> = {
  CALL_CLICK: 'Call',
  EMERGENCY_ASSIST: 'Emergency',
  CALLBACK_REQUEST: 'Callback',
};

const TYPE_TONE: Record<IncomingLeadType, StatusBadgeTone> = {
  CALL_CLICK: 'medium',
  EMERGENCY_ASSIST: 'emergency',
  CALLBACK_REQUEST: 'info',
};

function formatAge(iso: string): string {
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return '';
  const diff = Math.max(0, Date.now() - ts);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}

interface CardProps {
  lead: IncomingLead;
  onHandled: (id: string) => void;
  onDismiss: (id: string) => void;
}

function LeadCard({ lead, onHandled, onDismiss }: CardProps): React.JSX.Element {
  const copy = getLeadDisplayCopy(lead);
  const toast = useToast();
  // Tracks which card-level action is in-flight so we can show a loading
  // state and block duplicate taps. Always reset in finally.
  const [busyAction, setBusyAction] = useState<
    'open_qb' | 'handled' | 'dismiss' | null
  >(null);

  function openQuickBooking(): void {
    if (busyAction) return;
    setBusyAction('open_qb');
    try {
      const params = new URLSearchParams();
      if (lead.phone) params.set('phone', lead.phone);
      if (lead.customerName) params.set('customerName', lead.customerName);
      if (lead.tyreProblemType) params.set('tyreProblemType', lead.tyreProblemType);
      if (lead.jobType) params.set('jobType', lead.jobType);
      if (lead.vehicleRegistration) params.set('vehicleRegistration', lead.vehicleRegistration);
      if (lead.locationLabel) params.set('locationLabel', lead.locationLabel);
      if (typeof lead.latitude === 'number') params.set('latitude', String(lead.latitude));
      if (typeof lead.longitude === 'number') params.set('longitude', String(lead.longitude));
      if (lead.callClickEventId) params.set('callClickEventId', lead.callClickEventId);
      params.set(
        'prefillSource',
        lead.type === 'EMERGENCY_ASSIST' ? 'emergency_assist' : 'call_click',
      );
      router.push(`/quick-booking?${params.toString()}`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[IncomingLeads] open quick booking failed', err);
      toast.error('Could not open Quick Booking. Please try again.');
    } finally {
      setBusyAction(null);
    }
  }

  function callCustomer(): void {
    if (!lead.phone) return;
    void Linking.openURL(`tel:${lead.phone}`).catch(() => {
      // best-effort
    });
  }

  function handleMarkHandled(): void {
    if (busyAction) return;
    setBusyAction('handled');
    try {
      onHandled(lead.id);
    } finally {
      setBusyAction(null);
    }
  }

  function handleDismissPress(): void {
    if (busyAction) return;
    setBusyAction('dismiss');
    try {
      onDismiss(lead.id);
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <AnimatedCard>
      <View className="bg-surface border border-border rounded-xl p-4 mb-3">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center" style={{ gap: 6 }}>
            <StatusBadge tone={TYPE_TONE[lead.type]} label={TYPE_LABEL[lead.type]} />
            <StatusBadge tone={STATUS_TONE[lead.status]} label={STATUS_LABEL[lead.status]} />
          </View>
          <Text className="text-text-muted text-xs">{formatAge(lead.createdAt)}</Text>
        </View>
        <Text className="text-text font-semibold text-base">{copy.title}</Text>
        {copy.subtitle ? (
          <Text className="text-text-dim text-sm mt-1">{copy.subtitle}</Text>
        ) : null}
        {lead.locationLabel ? (
          <Text className="text-text-muted text-xs mt-1">📍 {lead.locationLabel}</Text>
        ) : null}
        {lead.sourcePage ? (
          <Text className="text-text-muted text-xs mt-1">From {lead.sourcePage}</Text>
        ) : null}

        <View className="mt-3" style={{ gap: 8 }}>
          {(lead.status === 'NEW' || lead.status === 'VIEWED' || lead.status === 'IN_PROGRESS') && (
            <AdminButton
              label="Open Quick Booking"
              loadingLabel="Opening…"
              loading={busyAction === 'open_qb'}
              disabled={busyAction !== null && busyAction !== 'open_qb'}
              variant="primary"
              size="md"
              fullWidth
              onPress={openQuickBooking}
            />
          )}
          {lead.phone ? (
            <AdminButton
              label="Call customer"
              variant="secondary"
              size="md"
              fullWidth
              onPress={callCustomer}
            />
          ) : null}
          {(lead.status === 'NEW' || lead.status === 'VIEWED' || lead.status === 'IN_PROGRESS') && (
            <View className="flex-row" style={{ gap: 8 }}>
              <View style={{ flex: 1 }}>
                <AdminButton
                  label="Mark handled"
                  loading={busyAction === 'handled'}
                  disabled={busyAction !== null && busyAction !== 'handled'}
                  variant="success"
                  size="sm"
                  fullWidth
                  onPress={handleMarkHandled}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AdminButton
                  label="Dismiss"
                  loading={busyAction === 'dismiss'}
                  disabled={busyAction !== null && busyAction !== 'dismiss'}
                  variant="ghost"
                  size="sm"
                  fullWidth
                  onPress={handleDismissPress}
                />
              </View>
            </View>
          )}
        </View>
      </View>
    </AnimatedCard>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View className="mb-4">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-text font-semibold text-sm uppercase tracking-wide">{title}</Text>
        <Text className="text-text-muted text-xs">{count}</Text>
      </View>
      {children}
    </View>
  );
}

export default function IncomingLeadsScreen(): React.JSX.Element {
  const { incomingLeads, incomingLeadHistory, markLeadHandled, dismissLead } = useNotifications();

  const { active, inProgress } = useMemo(() => {
    const a: IncomingLead[] = [];
    const ip: IncomingLead[] = [];
    for (const l of incomingLeads) {
      if (l.status === 'NEW' || l.status === 'VIEWED') a.push(l);
      else if (l.status === 'IN_PROGRESS') ip.push(l);
    }
    return { active: a, inProgress: ip };
  }, [incomingLeads]);

  const recent = useMemo(() => incomingLeadHistory.slice(0, 20), [incomingLeadHistory]);
  const totalActive = active.length + inProgress.length;

  function goBack(): void {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/today' as never);
    }
  }

  return (
    <AppShell>
      <OfflineBanner />
      <ScreenHeader
        title="Incoming leads"
        subtitle={
          totalActive === 0
            ? 'No incoming leads waiting.'
            : `${totalActive} active · ${active.length} waiting`
        }
        right={
          <Pressable
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={8}
            className="px-3 py-2 rounded-lg border border-border bg-surface"
          >
            <Text className="text-text text-sm font-semibold">← Back</Text>
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 32 }}>
        {totalActive === 0 && recent.length === 0 ? (
          <View className="bg-surface border border-border rounded-xl p-6 items-center">
            <Text className="text-text font-semibold text-base mb-1">All clear</Text>
            <Text className="text-text-muted text-xs text-center">
              No incoming leads waiting. New website calls and emergency assists will appear here.
            </Text>
          </View>
        ) : null}

        {active.length > 0 ? (
          <Section title="Active / waiting" count={active.length}>
            {active.map((l) => (
              <LeadCard key={l.id} lead={l} onHandled={markLeadHandled} onDismiss={dismissLead} />
            ))}
          </Section>
        ) : null}

        {inProgress.length > 0 ? (
          <Section title="In progress" count={inProgress.length}>
            {inProgress.map((l) => (
              <LeadCard key={l.id} lead={l} onHandled={markLeadHandled} onDismiss={dismissLead} />
            ))}
          </Section>
        ) : null}

        {recent.length > 0 ? (
          <Section title="Recent" count={recent.length}>
            {recent.map((l) => (
              <LeadCard key={l.id} lead={l} onHandled={markLeadHandled} onDismiss={dismissLead} />
            ))}
          </Section>
        ) : null}
      </ScrollView>
    </AppShell>
  );
}
