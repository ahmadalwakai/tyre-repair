import type { Metadata } from 'next';
import { PayBalanceClient } from '@/components/checkout/PayBalanceClient';

export const metadata: Metadata = {
  title: 'Pay outstanding balance | TyreRepair UK',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ bookingId: string }>;
}

export default async function PayBalancePage({ params }: PageProps) {
  const { bookingId } = await params;
  return <PayBalanceClient bookingId={bookingId} />;
}
