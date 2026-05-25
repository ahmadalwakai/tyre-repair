import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Box, Container } from '@chakra-ui/react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { FloatingActions } from '@/components/floating/FloatingActions';
import { CheckoutShell } from '@/components/checkout/CheckoutShell';
import { db, schema, eq, alias } from '@tyrerepair/db';
import { availabilityFromQuantity } from '@/lib/quote/tyres';
import type { CheckoutQuoteSummary } from '@/lib/checkout/types';
import type { QuoteJobType, TyreProblemType } from '@/types/quote';

export const metadata: Metadata = {
  title: 'Secure Emergency Tyre Checkout | TyreRepair UK',
  description:
    'Complete secure payment for your emergency mobile tyre repair or replacement quote.',
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ quoteId?: string }>;
}

async function loadCheckoutSummary(quoteId: string): Promise<CheckoutQuoteSummary | null> {
  const backupTyre = alias(schema.tyreCatalog, 'backup_tyre');
  const rows = await db
    .select({
      quoteId: schema.quotes.id,
      basePriceGbp: schema.quotes.basePriceGbp,
      totalPriceGbp: schema.quotes.totalPriceGbp,
      pricingBreakdown: schema.quotes.pricingBreakdown,
      expiresAt: schema.quotes.expiresAt,
      jobType: schema.quotes.jobType,
      tyreProblemType: schema.quotes.tyreProblemType,
      assessmentFeeGbp: schema.quotes.assessmentFeeGbp,
      tyreId: schema.tyreCatalog.id,
      brand: schema.tyreCatalog.brand,
      model: schema.tyreCatalog.model,
      sizeLabel: schema.tyreCatalog.sizeLabel,
      speedRating: schema.tyreCatalog.speedRating,
      loadIndex: schema.tyreCatalog.loadIndex,
      quantityAvailable: schema.stock.quantityAvailable,
      backupBrand: backupTyre.brand,
      backupModel: backupTyre.model,
      backupSizeLabel: backupTyre.sizeLabel,
    })
    .from(schema.quotes)
    .leftJoin(schema.tyreCatalog, eq(schema.tyreCatalog.id, schema.quotes.tyreId))
    .leftJoin(schema.stock, eq(schema.stock.tyreId, schema.tyreCatalog.id))
    .leftJoin(backupTyre, eq(backupTyre.id, schema.quotes.backupTyreId))
    .where(eq(schema.quotes.id, quoteId))
    .limit(1);

  const r = rows[0];
  if (!r) return null;

  const jobType = (r.jobType ?? 'REPLACEMENT') as QuoteJobType;
  if (jobType === 'REPLACEMENT' && (!r.tyreId || !r.brand || !r.model || !r.sizeLabel)) {
    return null;
  }

  const quantity = r.quantityAvailable ?? 0;
  const availability = jobType === 'ASSESSMENT' ? 'in_stock' : availabilityFromQuantity(quantity);

  const pb =
    r.pricingBreakdown && typeof r.pricingBreakdown === 'object'
      ? (r.pricingBreakdown as Record<string, unknown>)
      : {};
  const distanceFeeGbp = readString(pb['distanceFeeGbp']) ?? '0.00';

  // Recover the customer's locking-nut answer that was stashed at quote
  // creation. Falls back to null when the quote pre-dates this feature or
  // the customer skipped the question (legacy ASSESSMENT path).
  let lockingWheelNutStatus: CheckoutQuoteSummary['lockingWheelNutStatus'] = null;
  const cs = pb['_customerSelections'];
  if (cs && typeof cs === 'object') {
    const v = (cs as Record<string, unknown>)['lockingWheelNutStatus'];
    if (v === 'HAVE_KEY' || v === 'NO_KEY' || v === 'STANDARD_ONLY') {
      lockingWheelNutStatus = v;
    }
  }

  const tyre =
    jobType === 'REPLACEMENT' && r.brand && r.model && r.sizeLabel
      ? {
          brand: r.brand,
          model: r.model,
          sizeLabel: r.sizeLabel,
          speedRating: r.speedRating ?? null,
          loadIndex: r.loadIndex ?? null,
        }
      : null;

  const backup =
    r.backupBrand && r.backupModel && r.backupSizeLabel
      ? {
          brand: r.backupBrand,
          model: r.backupModel,
          sizeLabel: r.backupSizeLabel,
        }
      : null;

  return {
    quoteId: r.quoteId,
    jobType,
    tyreProblemType: (r.tyreProblemType ?? null) as TyreProblemType | null,
    tyre,
    backupTyre: backup,
    assessmentFeeGbp: r.assessmentFeeGbp ? String(r.assessmentFeeGbp) : null,
    pricing: {
      basePriceGbp: String(r.basePriceGbp),
      distanceFeeGbp,
      vatRate: 0,
      vatAmountGbp: '0.00',
      totalPriceGbp: String(r.totalPriceGbp),
      currency: 'GBP',
    },
    availability,
    isSpecialOrder: availability === 'special_order',
    expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
    lockingWheelNutStatus,
  };
}

function readString(v: unknown): string | null {
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return v.toFixed(2);
  return null;
}

export default async function CheckoutPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const quoteId = typeof params.quoteId === 'string' ? params.quoteId.trim() : '';
  // Phase 10: hard-redirect to /quote if quoteId is missing.
  if (!quoteId) {
    redirect('/quote');
  }
  const quote = await loadCheckoutSummary(quoteId);
  // Phase 10: if the quote can't be loaded (expired, deleted, malformed),
  // send the user back to start a fresh quote with an explicit flag.
  if (!quote) {
    redirect('/quote?expired=1');
  }

  return (
    <>
      <SiteHeader />
      <Box as="main" py={{ base: '8', md: '12' }} bg="bg.canvas">
        <Container maxW="3xl">
          <CheckoutShell quote={quote} />
        </Container>
      </Box>
      <SiteFooter />
      <FloatingActions />
    </>
  );
}
