'use client';
import { useEffect, useState } from 'react';
import { Heading, HStack, Stack, Text } from '@chakra-ui/react';
import { GoldButton } from '@/components/ui/GoldButton';
import { siteConfig } from '@/lib/site-config';
import type { TrackingBookingResult, TrackingTimelineEvent } from '@/lib/bookings/types';
import { TrackingSummaryCard } from './TrackingSummaryCard';
import { TrackingStatusTimeline } from './TrackingStatusTimeline';

interface TrackingPageData extends Omit<TrackingBookingResult, 'timeline'> {
  statusLabel: string;
  statusDescription: string;
  timeline: Array<TrackingTimelineEvent & { label: string }>;
}

export interface TrackingPageProps {
  data: TrackingPageData;
}

interface TrackingApiResponse {
  trackingId: string;
  status: TrackingBookingResult['status'];
  statusLabel: string;
  statusDescription: string;
  paymentStatus: string;
  tyre: TrackingBookingResult['tyre'];
  availability: TrackingBookingResult['availability'];
  isSpecialOrder: boolean;
  location: TrackingBookingResult['location'];
  totalPriceGbp: string;
  currency: 'GBP';
  createdAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  refundedAt: string | null;
  timeline: Array<{
    toStatus: TrackingBookingResult['status'];
    fromStatus: TrackingBookingResult['status'] | null;
    label: string;
    message: string | null;
    createdAt: string;
  }>;
}

const REFRESH_INTERVAL_MS = 20_000;

export function TrackingPage({ data: initial }: TrackingPageProps) {
  const [data, setData] = useState<TrackingPageData>(initial);

  useEffect(() => {
    let cancelled = false;
    const id = window.setInterval(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/bookings/${initial.trackingId}`, {
            cache: 'no-store',
          });
          if (!res.ok) return;
          const fresh = (await res.json()) as TrackingApiResponse;
          if (cancelled) return;
          setData((prev) => ({
            ...prev,
            status: fresh.status,
            paymentStatus: fresh.paymentStatus as TrackingBookingResult['paymentStatus'],
            statusLabel: fresh.statusLabel,
            statusDescription: fresh.statusDescription,
            tyre: fresh.tyre,
            availability: fresh.availability,
            isSpecialOrder: fresh.isSpecialOrder,
            location: fresh.location,
            totalPriceGbp: fresh.totalPriceGbp,
            confirmedAt: fresh.confirmedAt,
            cancelledAt: fresh.cancelledAt,
            refundedAt: fresh.refundedAt,
            timeline: fresh.timeline,
          }));
        } catch {
          /* poll error — ignore */
        }
      })();
    }, REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [initial.trackingId]);

  return (
    <Stack gap="6">
      <Stack gap="2">
        <Heading as="h1" color="accent.neon" fontFamily="heading">
          Your emergency callout
        </Heading>
        <Text color="fg.muted">
          We&apos;ll update this page automatically as your booking progresses.
        </Text>
      </Stack>

      <TrackingSummaryCard data={data} />

      <TrackingStatusTimeline events={data.timeline} />

      <HStack gap="3" wrap="wrap">
        <GoldButton
          href={siteConfig.phoneHref}
          variant="solid"
          callTrackingSource="TRACKING_PAGE_CALL"
        >
          {siteConfig.secondaryCtaLabel}
        </GoldButton>
        <GoldButton href={siteConfig.whatsappHref} variant="outline">
          {siteConfig.whatsappCtaLabel}
        </GoldButton>
      </HStack>
    </Stack>
  );
}
