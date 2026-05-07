import { db, schema, eq, and, ne, isNotNull } from '@tyrerepair/db';
import { generateTrackingId } from '@tyrerepair/db';
import { createBookingPaymentIntent } from '@/lib/payments/stripe';
import {
  CreatePendingBookingError,
  type CheckoutPaymentMode,
  type CreatePendingBookingInput,
  type CreatePendingBookingResult,
  type LockingWheelNutStatus,
} from './types';

const TRACKING_ID_RETRIES = 5;

/** Default 15% dispatch deposit when customer chooses DEPOSIT mode. */
const DEPOSIT_PERCENTAGE = 0.15;
/** Minimum deposit floor (£) to prevent uneconomic micro-deposits. */
const MINIMUM_DEPOSIT_GBP = 10;

function toPence(amount: string | number): number {
  const n = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

interface DepositCalculation {
  depositAmountGbp: string;
  balanceDueGbp: string;
  depositPercentage: string;
}

function calculateDeposit(totalPriceGbp: string): DepositCalculation {
  const total = Number(totalPriceGbp);
  if (!Number.isFinite(total) || total <= 0) {
    return { depositAmountGbp: '0.00', balanceDueGbp: '0.00', depositPercentage: '0.1500' };
  }
  const rawDeposit = total * DEPOSIT_PERCENTAGE;
  const minimumApplied =
    total >= MINIMUM_DEPOSIT_GBP ? Math.max(rawDeposit, MINIMUM_DEPOSIT_GBP) : total;
  const deposit = Math.min(minimumApplied, total);
  const balance = Math.max(0, total - deposit);
  return {
    depositAmountGbp: deposit.toFixed(2),
    balanceDueGbp: balance.toFixed(2),
    depositPercentage: '0.1500',
  };
}

interface QuoteRow {
  id: string;
  tyreId: string | null;
  locationId: string | null;
  customerId: string | null;
  totalPriceGbp: string;
  expiresAt: Date | null;
  jobType: 'ASSESSMENT' | 'REPLACEMENT';
  tyreProblemType:
    | 'PUNCTURE_OR_FLAT'
    | 'DAMAGED_OR_BLOWN_OUT'
    | 'SLOW_PRESSURE_LOSS'
    | 'NEEDS_REPLACEMENT'
    | 'NOT_SURE'
    | null;
  assessmentFeeGbp: string | null;
  backupTyreId: string | null;
}

async function loadQuote(quoteId: string): Promise<QuoteRow> {
  const rows = await db
    .select({
      id: schema.quotes.id,
      tyreId: schema.quotes.tyreId,
      locationId: schema.quotes.locationId,
      customerId: schema.quotes.customerId,
      totalPriceGbp: schema.quotes.totalPriceGbp,
      expiresAt: schema.quotes.expiresAt,
      jobType: schema.quotes.jobType,
      tyreProblemType: schema.quotes.tyreProblemType,
      assessmentFeeGbp: schema.quotes.assessmentFeeGbp,
      backupTyreId: schema.quotes.backupTyreId,
    })
    .from(schema.quotes)
    .where(eq(schema.quotes.id, quoteId))
    .limit(1);
  const r = rows[0];
  if (!r) throw new CreatePendingBookingError('quote_not_found', 'Quote not found');
  if (r.jobType === 'REPLACEMENT' && !r.tyreId) {
    throw new CreatePendingBookingError('tyre_unavailable', 'Quote has no tyre');
  }
  if (r.expiresAt && r.expiresAt.getTime() < Date.now()) {
    throw new CreatePendingBookingError('quote_expired', 'Quote has expired');
  }
  return {
    id: r.id,
    tyreId: r.tyreId,
    locationId: r.locationId,
    customerId: r.customerId,
    totalPriceGbp: r.totalPriceGbp,
    expiresAt: r.expiresAt,
    jobType: r.jobType ?? 'REPLACEMENT',
    tyreProblemType: r.tyreProblemType ?? null,
    assessmentFeeGbp: r.assessmentFeeGbp ? String(r.assessmentFeeGbp) : null,
    backupTyreId: r.backupTyreId ?? null,
  };
}

async function ensureNoActiveBookingForQuote(quoteId: string): Promise<void> {
  const existing = await db
    .select({ id: schema.bookings.id, status: schema.bookings.status })
    .from(schema.bookings)
    .where(
      and(
        eq(schema.bookings.quoteId, quoteId),
        ne(schema.bookings.status, 'failed'),
        ne(schema.bookings.status, 'cancelled'),
      ),
    )
    .limit(1);
  if (existing[0]) {
    throw new CreatePendingBookingError(
      'quote_already_booked',
      'This quote already has a booking in progress.',
    );
  }
}

async function upsertCustomer(input: CreatePendingBookingInput, existingId: string | null) {
  if (existingId) {
    try {
      await db
        .update(schema.customers)
        .set({
          fullName: input.customerName,
          phone: input.customerPhone,
          email: input.customerEmail,
          updatedAt: new Date(),
        })
        .where(eq(schema.customers.id, existingId));
      return existingId;
    } catch {
      throw new CreatePendingBookingError('db_error', 'Could not update customer');
    }
  }
  // Try to match by phone first
  const byPhone = await db
    .select({ id: schema.customers.id })
    .from(schema.customers)
    .where(eq(schema.customers.phone, input.customerPhone))
    .limit(1);
  if (byPhone[0]) {
    try {
      await db
        .update(schema.customers)
        .set({
          fullName: input.customerName,
          email: input.customerEmail,
          updatedAt: new Date(),
        })
        .where(eq(schema.customers.id, byPhone[0].id));
      return byPhone[0].id;
    } catch {
      throw new CreatePendingBookingError('db_error', 'Could not update customer');
    }
  }
  try {
    const inserted = await db
      .insert(schema.customers)
      .values({
        fullName: input.customerName,
        phone: input.customerPhone,
        email: input.customerEmail,
      })
      .returning({ id: schema.customers.id });
    const id = inserted[0]?.id;
    if (!id) throw new Error('no id');
    return id;
  } catch {
    throw new CreatePendingBookingError('db_error', 'Could not create customer');
  }
}

interface InsertedBooking {
  bookingId: string;
  trackingId: string;
}

async function insertBookingWithTrackingRetry(
  input: {
    quoteId: string;
    customerId: string;
    locationId: string | null;
    tyreId: string | null;
    lockingWheelNutStatus: LockingWheelNutStatus;
    jobType: 'ASSESSMENT' | 'REPLACEMENT';
    tyreProblemType: QuoteRow['tyreProblemType'];
    assessmentFeeGbp: string | null;
    backupTyreId: string | null;
  },
): Promise<InsertedBooking> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < TRACKING_ID_RETRIES; attempt++) {
    const trackingId = generateTrackingId();
    try {
      const inserted = await db
        .insert(schema.bookings)
        .values({
          trackingId,
          quoteId: input.quoteId,
          customerId: input.customerId,
          locationId: input.locationId,
          tyreId: input.tyreId,
          status: 'pending_payment',
          paymentStatus: 'processing',
          lockingWheelNutStatus: input.lockingWheelNutStatus,
          jobType: input.jobType,
          tyreProblemType: input.tyreProblemType,
          assessmentFeeGbp: input.assessmentFeeGbp,
          backupTyreId: input.backupTyreId,
        })
        .returning({
          id: schema.bookings.id,
          trackingId: schema.bookings.trackingId,
        });
      const created = inserted[0];
      if (created) return { bookingId: created.id, trackingId: created.trackingId };
    } catch (err) {
      lastError = err;
      // collision on unique tracking id — retry
      continue;
    }
  }
  throw new CreatePendingBookingError(
    'tracking_collision',
    `Could not allocate tracking ID after ${TRACKING_ID_RETRIES} attempts: ${String(lastError)}`,
  );
}

export async function createPendingBookingForQuote(
  input: CreatePendingBookingInput,
): Promise<CreatePendingBookingResult> {
  const quote = await loadQuote(input.quoteId);
  await ensureNoActiveBookingForQuote(quote.id);

  const customerId = await upsertCustomer(input, quote.customerId);

  // Attach customer to quote if not already set
  if (!quote.customerId) {
    try {
      await db
        .update(schema.quotes)
        .set({ customerId, updatedAt: new Date() })
        .where(and(eq(schema.quotes.id, quote.id), isNotNull(schema.quotes.id)));
    } catch {
      // non-fatal: continue
    }
  }

  if (quote.jobType === 'REPLACEMENT' && !quote.tyreId) {
    throw new CreatePendingBookingError('tyre_unavailable', 'Quote has no tyre');
  }

  const { bookingId, trackingId } = await insertBookingWithTrackingRetry({
    quoteId: quote.id,
    customerId,
    locationId: quote.locationId,
    tyreId: quote.tyreId,
    lockingWheelNutStatus: input.lockingWheelNutStatus ?? 'STANDARD_ONLY',
    jobType: quote.jobType,
    tyreProblemType: quote.tyreProblemType,
    assessmentFeeGbp: quote.assessmentFeeGbp,
    backupTyreId: quote.backupTyreId,
  });

  const checkoutPaymentMode: CheckoutPaymentMode =
    input.checkoutPaymentMode === 'DEPOSIT' ? 'DEPOSIT' : 'FULL';
  const isDeposit = checkoutPaymentMode === 'DEPOSIT';
  if (isDeposit && !input.customerAcceptedDepositTerms) {
    await markBookingFailed(bookingId);
    throw new CreatePendingBookingError(
      'invalid_input',
      'Deposit terms must be accepted before paying a deposit.',
    );
  }

  const depositCalc = isDeposit ? calculateDeposit(quote.totalPriceGbp) : null;
  const totalPence = toPence(quote.totalPriceGbp);
  const chargePence = isDeposit && depositCalc ? toPence(depositCalc.depositAmountGbp) : totalPence;

  // Persist deposit fields on booking before charging.
  try {
    if (isDeposit && depositCalc) {
      await db
        .update(schema.bookings)
        .set({
          checkoutPaymentMode: 'DEPOSIT',
          depositPercentage: depositCalc.depositPercentage,
          depositAmountGbp: depositCalc.depositAmountGbp,
          balanceDueGbp: depositCalc.balanceDueGbp,
          customerAcceptedDepositTermsAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.bookings.id, bookingId));
    } else {
      await db
        .update(schema.bookings)
        .set({
          checkoutPaymentMode: 'FULL',
          balanceDueGbp: '0.00',
          updatedAt: new Date(),
        })
        .where(eq(schema.bookings.id, bookingId));
    }
  } catch {
    // non-fatal: continue
  }

  // Compute amount in pence
  const amountPence = chargePence;
  if (amountPence <= 0) {
    await markBookingFailed(bookingId);
    throw new CreatePendingBookingError('db_error', 'Quote total is invalid');
  }

  // Business is not VAT registered — always zero.
  const vatGbp = '0.00';

  let intent;
  try {
    intent = await createBookingPaymentIntent({
      amountPence,
      currency: 'gbp',
      customerEmail: input.customerEmail,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      receiptEmail: input.customerEmail,
      description: isDeposit
        ? `TyreRepair UK 15% dispatch deposit ${trackingId}`
        : `TyreRepair UK emergency booking ${trackingId}`,
      metadata: {
        bookingId,
        quoteId: quote.id,
        trackingId,
        customerId,
        tyreId: quote.tyreId ?? '',
        jobType: quote.jobType,
        paymentKind: isDeposit ? 'deposit' : 'full',
      },
    });
  } catch {
    await markBookingFailed(bookingId);
    throw new CreatePendingBookingError(
      'stripe_failed',
      'Could not create Stripe PaymentIntent',
    );
  }

  let paymentId: string;
  try {
    const insertedPayment = await db
      .insert(schema.payments)
      .values({
        bookingId,
        quoteId: quote.id,
        stripePaymentIntentId: intent.paymentIntentId,
        amountGbp: (amountPence / 100).toFixed(2),
        vatAmountGbp: String(vatGbp),
        currency: 'gbp',
        status: 'processing',
        paymentKind: isDeposit ? 'deposit' : 'full',
      })
      .returning({ id: schema.payments.id });
    const created = insertedPayment[0];
    if (!created) throw new Error('no payment id');
    paymentId = created.id;
  } catch {
    await markBookingFailed(bookingId);
    throw new CreatePendingBookingError('db_error', 'Could not record payment');
  }

  return {
    bookingId,
    trackingId,
    customerId,
    paymentId,
    clientSecret: intent.clientSecret,
    amountGbp: (amountPence / 100).toFixed(2),
    currency: 'gbp',
    checkoutPaymentMode,
    depositAmountGbp: isDeposit && depositCalc ? depositCalc.depositAmountGbp : null,
    balanceDueGbp: isDeposit && depositCalc ? depositCalc.balanceDueGbp : null,
    totalPriceGbp: quote.totalPriceGbp,
  };
}

async function markBookingFailed(bookingId: string): Promise<void> {
  try {
    await db
      .update(schema.bookings)
      .set({
        status: 'failed',
        paymentStatus: 'failed',
        updatedAt: new Date(),
      })
      .where(eq(schema.bookings.id, bookingId));
  } catch {
    // best-effort cleanup
  }
}
