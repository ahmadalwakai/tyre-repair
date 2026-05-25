import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { GoldCard } from '@/components/ui/GoldCard';
import { listAuditLogs, type AuditLogItem } from '@/lib/api/financial-safety';
import { ApiError } from '@/lib/api/client';

/**
 * Booking-scoped pricing audit timeline.
 *
 * Surfaces the small subset of audit actions that matter to a normal admin
 * reviewing a job:
 *  - public payment blocked by safety
 *  - admin confirmed a high-risk job
 *  - manual review confirmed
 *  - below-recommended-minimum override
 *  - generic pricing override applied
 *
 * Pulled from the existing /api/admin/audit-logs endpoint, scoped by
 * bookingId. Read-only, no secrets exposed.
 */
const PRICING_ACTION_LABELS: Record<string, string> = {
  'pricing.safety.public_payment_blocked': 'Public payment blocked',
  'pricing.admin_confirmed_high_risk': 'Admin confirmed high-risk job',
  'pricing.manual_review.confirmed': 'Manual review confirmed',
  'pricing.override.below_recommended_minimum': 'Override: below recommended minimum',
  'pricing.override.applied': 'Pricing override applied',
};

function isPricingAction(action: string): boolean {
  return action.startsWith('pricing.');
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function reasonFromMetadata(item: AuditLogItem): string | null {
  const meta = item.metadata ?? {};
  const reason =
    (typeof meta['reason'] === 'string' && meta['reason']) ||
    (typeof meta['note'] === 'string' && meta['note']) ||
    (typeof meta['overrideReason'] === 'string' && meta['overrideReason']) ||
    null;
  return reason || null;
}

export function BookingPricingAuditPanel({
  bookingId,
}: {
  bookingId: string;
}): React.JSX.Element | null {
  const [items, setItems] = useState<AuditLogItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await listAuditLogs({ bookingId, limit: 50 });
      const filtered = res.items.filter((it) => isPricingAction(it.action));
      setItems(filtered);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load pricing audit');
    } finally {
      setLoaded(true);
    }
  }, [bookingId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!loaded) return null;
  if (!error && (!items || items.length === 0)) return null;

  return (
    <GoldCard className="mb-3" tone="info" icon="🛡" title="Pricing decisions">
      {error ? (
        <Text className="text-text-dim text-xs">{error}</Text>
      ) : items && items.length > 0 ? (
        <View>
          {items.map((it) => {
            const label = PRICING_ACTION_LABELS[it.action] ?? it.action;
            const actor =
              it.actorLabel ?? (it.actorType === 'admin' ? 'Admin' : it.actorType);
            const reason = reasonFromMetadata(it);
            return (
              <View
                key={it.id}
                className="mb-2 pb-2 border-b border-border last:border-b-0"
              >
                <View className="flex-row justify-between">
                  <Text className="text-text font-semibold text-xs flex-1 pr-2">
                    {label}
                  </Text>
                  <Text className="text-text-dim text-[10px]">
                    {formatTimestamp(it.createdAt)}
                  </Text>
                </View>
                <Text className="text-text-dim text-[11px] mt-0.5">By {actor}</Text>
                {reason ? (
                  <Text className="text-text text-xs mt-1">{reason}</Text>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}
    </GoldCard>
  );
}
