import type { Metadata } from 'next';
import { Box, Container } from '@chakra-ui/react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { FloatingActions } from '@/components/floating/FloatingActions';
import { TrackingPage } from '@/components/tracking/TrackingPage';
import { TrackingErrorState } from '@/components/tracking/TrackingErrorState';
import { getBookingByTrackingId } from '@/lib/bookings/tracking';
import {
  getCustomerStatusDescription,
  getCustomerStatusLabel,
} from '@/lib/bookings/status';
import { trackingIdSchema } from '@/lib/validation/checkout';

export const metadata: Metadata = {
  title: 'Track your emergency callout | TyreRepair UK',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ trackingId: string }>;
}

export default async function TrackPage({ params }: PageProps) {
  const { trackingId } = await params;
  const parsed = trackingIdSchema.safeParse(trackingId);

  let content;
  if (!parsed.success) {
    content = (
      <TrackingErrorState message="That tracking reference doesn’t look right. Please check the link in your text or email." />
    );
  } else {
    const booking = await getBookingByTrackingId(parsed.data);
    if (!booking) {
      content = (
        <TrackingErrorState message="We couldn’t find a booking with that reference. Please check the link in your text or email, or call us for help." />
      );
    } else {
      content = (
        <TrackingPage
          data={{
            ...booking,
            statusLabel: getCustomerStatusLabel(booking.status),
            statusDescription: getCustomerStatusDescription(booking.status),
            timeline: booking.timeline.map((t) => ({
              ...t,
              label: getCustomerStatusLabel(t.toStatus),
            })),
          }}
        />
      );
    }
  }

  return (
    <>
      <SiteHeader />
      <Box as="main" py={{ base: '8', md: '12' }} bg="bg.canvas">
        <Container maxW="2xl">{content}</Container>
      </Box>
      <SiteFooter />
      <FloatingActions />
    </>
  );
}
