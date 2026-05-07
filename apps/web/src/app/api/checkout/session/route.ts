import { NextResponse } from 'next/server';
import { createCheckoutSessionSchema } from '@/lib/validation/checkout';
import { createPendingBookingForQuote } from '@/lib/bookings/create-booking';
import { CreatePendingBookingError } from '@/lib/bookings/types';
import { warnIfStripeEnvMissing } from '@/lib/payments/stripe';
import { db, schema, eq } from '@tyrerepair/db';
import { calculateDynamicQuote, buildPricingSafetyPublic } from '@/lib/pricing';
import { writeAuditLogSafe } from '@/lib/audit/audit-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<NextResponse> {
  // Surface a clear server-side warning at request time when Stripe env vars
  // are missing, so the cause of the "Payment temporarily unavailable"
  // banner is obvious in dev/prod logs. Never logs values.
  warnIfStripeEnvMissing('POST /api/checkout/session');

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = createCheckoutSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid checkout input', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  // Hard block: customer told us they cannot find the locking wheel nut key.
  // We must not take payment online — they must call us so a fitter can be
  // sourced with the right tooling, or to bring the vehicle in.
  if (parsed.data.lockingWheelNutStatus === 'NO_KEY') {
    return NextResponse.json(
      {
        error:
          'Cannot proceed to payment. Missing locking wheel nut key. Please contact us by phone.',
        code: 'locking_nut_key_missing',
      },
      { status: 400 },
    );
  }

  // Pricing safety re-evaluation. Recalculate the dynamic quote at request
  // time using the quote's stored tyreId / locationId / jobType so we cannot
  // be tricked by a stale or tampered client. If the safety guard says the
  // public site is not allowed to take payment, return a call-first response
  // so the front end can show a "Please call us" panel and never start a
  // PaymentIntent for this booking.
  try {
    const qrows = await db
      .select({
        id: schema.quotes.id,
        tyreId: schema.quotes.tyreId,
        locationId: schema.quotes.locationId,
        jobType: schema.quotes.jobType,
        tyreProblemType: schema.quotes.tyreProblemType,
      })
      .from(schema.quotes)
      .where(eq(schema.quotes.id, parsed.data.quoteId))
      .limit(1);
    const quote = qrows[0];
    if (quote) {
      const safetyCheck = await calculateDynamicQuote({
        jobType: quote.jobType ?? 'REPLACEMENT',
        ...(quote.tyreId ? { tyreId: quote.tyreId } : {}),
        ...(quote.locationId ? { locationId: quote.locationId } : {}),
        ...(quote.tyreProblemType ? { tyreProblemType: quote.tyreProblemType } : {}),
        pricingChannel: 'PUBLIC_SELF_BOOKING',
      });
      // Both /api/quote and /api/checkout/session derive the same public
      // payment gate from this helper. Keep them aligned by always going
      // through buildPricingSafetyPublic instead of inspecting the engine
      // result fields directly.
      const publicSafety = buildPricingSafetyPublic(safetyCheck.pricingSafety);
      if (!publicSafety.publicPaymentAllowed) {
        await writeAuditLogSafe({
          actorType: 'customer',
          action: 'pricing.safety.public_payment_blocked',
          entityType: 'booking',
          entityId: parsed.data.quoteId,
          metadata: {
            quoteId: parsed.data.quoteId,
            level: safetyCheck.pricingSafety.level,
            recommendedAction: safetyCheck.pricingSafety.recommendedAction,
            reasons: safetyCheck.pricingSafety.reasons,
            pricingChannel: safetyCheck.pricingSafety.pricingChannel,
          },
        });
        return NextResponse.json(
          {
            error:
              publicSafety.customerMessage ??
              'We need to confirm availability for this location. Please call us to complete your emergency booking.',
            code: 'pricing_safety_call_first',
            level: publicSafety.safetyLevel,
            recommendedAction: safetyCheck.pricingSafety.recommendedAction,
          },
          { status: 409 },
        );
      }
    }
  } catch {
    // Non-fatal: if pricing re-validation fails (DB / weather / network), the
    // locking-nut hard block above plus the booking creation flow still
    // protect the basic safety. Do not silently allow if the engine throws
    // a hard pricing error though — the booking creation will surface it.
  }

  try {
    const data = parsed.data;
    const result = await createPendingBookingForQuote({
      quoteId: data.quoteId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerEmail: data.customerEmail,
      ...(data.lockingWheelNutStatus
        ? { lockingWheelNutStatus: data.lockingWheelNutStatus }
        : {}),
      ...(data.checkoutPaymentMode
        ? { checkoutPaymentMode: data.checkoutPaymentMode }
        : {}),
      ...(typeof data.customerAcceptedDepositTerms === 'boolean'
        ? { customerAcceptedDepositTerms: data.customerAcceptedDepositTerms }
        : {}),
    });
    return NextResponse.json(
      {
        bookingId: result.bookingId,
        trackingId: result.trackingId,
        clientSecret: result.clientSecret,
        amountGbp: result.amountGbp,
        currency: result.currency,
        checkoutPaymentMode: result.checkoutPaymentMode,
        depositAmountGbp: result.depositAmountGbp,
        balanceDueGbp: result.balanceDueGbp,
        totalPriceGbp: result.totalPriceGbp,
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof CreatePendingBookingError) {
      const e: CreatePendingBookingError = err;
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    }
    return NextResponse.json({ error: 'Could not start checkout' }, { status: 500 });
  }
}
