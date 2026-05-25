import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { AppShell, ScreenHeader } from '@/components/layout/AppShell';
import { OfflineBanner } from '@/components/system/OfflineBanner';
import { GoldButton } from '@/components/ui/GoldButton';
import { MoreMenuSection } from '@/components/navigation/MoreMenuSection';
import { MoreMenuItem } from '@/components/navigation/MoreMenuItem';
import { useSession } from '@/components/auth/SessionProvider';

export default function MoreScreen(): React.JSX.Element {
  const { signOut, admin } = useSession();

  return (
    <AppShell>
      <OfflineBanner />
      <ScreenHeader
        title="More"
        subtitle={admin?.email ?? 'Tools, settings and admin'}
      />
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 32 }}>
        <MoreMenuSection title="Operations">
          <MoreMenuItem
            label="Search"
            description="Find a booking, customer, phone or registration"
            href="/search"
          />
          <MoreMenuItem
            label="Quick booking"
            description="Create a phone booking in seconds"
            href="/quick-booking"
          />
          <MoreMenuItem
            label="Incoming leads"
            description="Website calls, emergency assists and callbacks"
            href="/incoming-leads"
          />
          <MoreMenuItem
            label="Callbacks"
            description="Customers waiting for a call back"
            href="/callbacks"
          />
          <MoreMenuItem
            label="Stock"
            description="Tyre catalogue and inventory"
            href="/stock"
          />
          <MoreMenuItem
            label="Pricing"
            description="Service pricing and overrides"
            href="/pricing"
          />
          <MoreMenuItem
            label="Live visitors"
            description="Customers active on the website right now"
            href="/visitors"
          />
        </MoreMenuSection>

        <MoreMenuSection title="Communication">
          <MoreMenuItem
            label="Inbox"
            description="In-app notifications and message centre"
            href="/notifications"
          />
        </MoreMenuSection>

        <MoreMenuSection title="Finance">
          <MoreMenuItem
            label="Outstanding balances"
            description="Deposits paid, balances still owed"
            href="/outstanding-balances"
          />
          <MoreMenuItem
            label="Failed payments"
            description="Card attempts that need follow-up"
            href="/failed-payments"
          />
          <MoreMenuItem
            label="Cash reconciliation"
            description="Today's collected totals breakdown"
            href="/cash-reconciliation"
          />
          <MoreMenuItem
            label="Daily close"
            description="End-of-day totals and retained deposits"
            href="/daily-close"
          />
        </MoreMenuSection>

        <MoreMenuSection title="Admin">
          <MoreMenuItem
            label="Dashboard"
            description="Operational overview and KPIs"
            href="/dashboard"
          />
          <MoreMenuItem
            label="Audit logs"
            description="Sensitive admin actions history"
            href="/audit"
          />
          <MoreMenuItem
            label="Diagnostics"
            description="Connection, sound and environment checks"
            href="/diagnostics"
          />
          <MoreMenuItem
            label="Outbox"
            description="Pending safe actions waiting to send"
            href="/outbox"
          />
          <MoreMenuItem
            label="Operational settings"
            description="Service hours, automation rules"
            href="/operational-settings"
          />
          <MoreMenuItem
            label="Settings"
            description="Account, preferences and devices"
            href="/settings"
          />
        </MoreMenuSection>

        <View className="mt-2">
          <GoldButton
            label="Sign out"
            variant="secondary"
            onPress={() => {
              void signOut();
            }}
          />
        </View>

        <Text className="text-text-dim text-[11px] text-center mt-4">
          TyreRepair UK · Admin
        </Text>
      </ScrollView>
    </AppShell>
  );
}
