import type { Metadata } from 'next';
import { Box } from '@chakra-ui/react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { FloatingActions } from '@/components/floating/FloatingActions';
import { QuoteFlow } from '@/components/quote/QuoteFlow';
import { buildSeoMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildSeoMetadata({
  title: 'Instant Mobile Tyre Fitting Quote | TyreRepair UK',
  description:
    'Get an instant mobile tyre fitting quote across Scotland. Find your vehicle, choose a tyre and share your location — no date or time picker.',
  path: '/quote',
});

export default function QuotePage() {
  return (
    <>
      <SiteHeader />
      <Box as="main">
        <QuoteFlow />
      </Box>
      <SiteFooter />
      <FloatingActions />
    </>
  );
}
