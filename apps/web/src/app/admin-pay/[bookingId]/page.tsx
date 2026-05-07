import type { Metadata } from 'next';
import { AdminPayClient } from '@/components/checkout/AdminPayClient';

export const metadata: Metadata = {
  title: 'Admin card payment | TyreRepair UK',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ bookingId: string }>;
}

export default async function AdminPayPage({ params }: PageProps) {
  const { bookingId } = await params;
  return <AdminPayClient bookingId={bookingId} />;
}
