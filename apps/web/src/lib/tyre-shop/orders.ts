/**
 * Order creation for the Tyre Shop flow.
 *
 * Mirrors apps/web/src/lib/bookings/create-booking.ts but for scheduled
 * tyre sales rather than emergency bookings. Reuses:
 *  - customers / customer_locations / bookings / payments tables
 *  - generateTrackingId
 *  - createBookingPaymentIntent (Stripe Payment Element)
 *  - existing webhook (no changes) for status + stock decrement on success
 *
 * Key differences from emergency flow:
 *  - No `quotes` row required; pricing is recomputed server-side from
 *    inputs and persisted into the new bookings columns.
 *  - `source = 'tyre_shop'` so admin lists can discriminate.
 *  - Backorder bookings still get a Stripe PaymentIntent — the existing
 *    decrement helper naturally no-ops for special-order/backorder rows.
 *  - HOME fitting requires lat/lng (validated by pricing helper).
 */
import { db, schema, eq } from '@tyrerepair/db';
import { generateTrackingId } from '@tyrerepair/db';
import { createBookingPaymentIntent } from '@/lib/payments/stripe';
import { calculateTyreShopQuote } from './pricing';
import { loadTyreShopCatalogRow } from './catalog';
import { getTyreShopFees } from './settings';
import { expectedReadyDateLabel } from './slots';
import type {
  FittingMethod,
  TyreShopAddress,
  TyreShopSelectedSlot,
  WheelNutAnswer,
} from '@/types/tyre-shop';

const TRACKING_ID_RETRIES = 5;

export type TyreShopOrderErrorCode =
  | 'invalid_input'
  | 'tyre_unavailable'
  | 'locking_nut_key_missing'
  | 'out_of_coverage'
  | 'address_required'
  | 'stripe_failed'
  | 'tracking_collision'
  | 'db_error';

export class TyreShopOrderError extends Error {
  public readonly code: TyreShopOrderErrorCode;
  public readonly status: number;
  constructor(code: TyreShopOrderErrorCode, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export interface CreateTyreShopOrderInput {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  tyreCatalogId: string;
  quantity: number;
  fittingMethod: FittingMethod;
  selectedSlot: TyreShopSelectedSlot;
  wheelNutAnswer: WheelNutAnswer;
  address?: TyreShopAddress;
  acceptsBackorder?: boolean;
  notes?: string;
}

export interface CreateTyreShopOrderResult {
  bookingId: string;
  trackingId: string;
  clientSecret: string;
  amountGbp: string;
  currency: 'gbp';
  totalGbp: number;
  isBackorder: boolean;
  expectedReadyDate: string | undefined;
}

function toPence(amount: number): number {
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.round(amount * 100);
}

async function upsertCustomer(input: CreateTyreShopOrderInput): Promise<string> {
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
      throw new TyreShopOrderError('db_error', 'Could not update customer', 500);
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
    throw new TyreShopOrderError('db_error', 'Could not create customer', 500);
  }
}

async function insertCustomerLocation(
  customerId: string,
  address: TyreShopAddress,
): Promise<string | null> {
  try {
    const inserted = await db
      .insert(schema.customerLocations)
      .values({
        customerId,
        captureMethod: address.latitude != null ? 'mapbox_autocomplete' : 'manual_address',
        addressLine1: address.line1 ?? null,
        addressLine2: address.line2 ?? null,
        city: address.city ?? null,
        postcode: address.postcode ?? null,
        latitude: address.latitude != null ? String(address.latitude) : null,
        longitude: address.longitude != null ? String(address.longitude) : null,
      })
      .returning({ id: schema.customerLocations.id });
    return inserted[0]?.id ?? null;
  } catch {
    return null;
  }
}

interface InsertedBooking {
  bookingId: string;
  trackingId: string;
}

interface BookingValues {
  customerId: string;
  locationId: string | null;
  tyreId: string;
  fittingMethod: FittingMethod;
  quantity: number;
  scheduledAt: Date;
  slotLabel: string;
  isBackorder: boolean;
  backorderEtaDays: number | null;
  fittingFeeGbp: string;
  distanceFeeGbp: string;
  totalGbp: string;
  wheelNutAnswer: WheelNutAnswer;
  notes?: string;
}

async function insertBookingWithRetry(values: BookingValues): Promise<InsertedBooking> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < TRACKING_ID_RETRIES; attempt++) {
    const trackingId = generateTrackingId();
    try {
      const inserted = await db
        .insert(schema.bookings)
        .values({
          trackingId,
          customerId: values.customerId,
          locationId: values.locationId,
          tyreId: values.tyreId,
          status: 'pending_payment',
          paymentStatus: 'processing',
          lockingWheelNutStatus: values.wheelNutAnswer === 'HAS_KEY' ? 'HAVE_KEY' : 'STANDARD_ONLY',
          jobType: 'REPLACEMENT',
          checkoutPaymentMode: 'FULL',
          source: 'tyre_shop',
          fittingMethod: values.fittingMethod,
          quantity: values.quantity,
          scheduledAt: values.scheduledAt,
          slotLabel: values.slotLabel,
          isBackorder: values.isBackorder,
          backorderEtaDays: values.backorderEtaDays,
          fittingFeeGbp: values.fittingFeeGbp,
          distanceFeeGbp: values.distanceFeeGbp,
          customerNotes: values.notes ?? null,
        })
        .returning({
          id: schema.bookings.id,
          trackingId: schema.bookings.trackingId,
        });
      const created = inserted[0];
      if (created) return { bookingId: created.id, trackingId: created.trackingId };
    } catch (err) {
      lastError = err;
      // eslint-disable-next-line no-console
      console.error('[tyre-shop/orders] booking insert attempt failed', err);
      continue;
    }
  }
  throw new TyreShopOrderError(
    'tracking_collision',
    `Could not allocate tracking ID after ${TRACKING_ID_RETRIES} attempts: ${String(lastError)}`,
    500,
  );
}

async function markBookingFailed(bookingId: string): Promise<void> {
  try {
    await db
      .update(schema.bookings)
      .set({ status: 'failed', paymentStatus: 'failed', updatedAt: new Date() })
      .where(eq(schema.bookings.id, bookingId));
  } catch {
    // non-fatal
  }
}

function parseSlotToDate(slot: TyreShopSelectedSlot): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(slot.date);
  const t = /^(\d{2}):(\d{2})$/.exec(slot.time);
  if (!m || !t) return null;
  const [, y, mo, d] = m;
  const [, h, mi] = t;
  const date = new Date(
    Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), 0, 0),
  );
  return Number.isFinite(date.getTime()) ? date : null;
}

export async function createTyreShopOrder(
  input: CreateTyreShopOrderInput,
): Promise<CreateTyreShopOrderResult> {
  // Hard customer-side input validation. Stricter checks belong in the
  // route handler with zod; these are last-line safety.
  if (
    !input.customerName ||
    !input.customerPhone ||
    !input.customerEmail ||
    !input.tyreCatalogId ||
    !input.selectedSlot?.date ||
    !input.selectedSlot?.time
  ) {
    throw new TyreShopOrderError('invalid_input', 'Missing required order fields');
  }

  const tyre = await loadTyreShopCatalogRow(input.tyreCatalogId);
  if (!tyre) {
    throw new TyreShopOrderError('tyre_unavailable', 'Tyre is no longer available');
  }

  const fees = await getTyreShopFees();
  const quote = calculateTyreShopQuote({
    basePriceGbp: tyre.basePriceGbp,
    quantity: input.quantity,
    fittingMethod: input.fittingMethod,
    effectiveStock: tyre.effectiveStock,
    fees,
    latitude: input.address?.latitude ?? null,
    longitude: input.address?.longitude ?? null,
    wheelNutAnswer: input.wheelNutAnswer,
  });

  if (!quote.allowed) {
    const code: TyreShopOrderErrorCode =
      quote.blockedReason === 'locking_nut_key_missing'
        ? 'locking_nut_key_missing'
        : quote.blockedReason === 'out_of_coverage'
          ? 'out_of_coverage'
          : 'address_required';
    throw new TyreShopOrderError(
      code,
      quote.message ?? 'Order cannot be processed online. Please call us.',
      code === 'locking_nut_key_missing' ? 409 : 400,
    );
  }

  // Backorder + customer hasn't accepted backorder terms = block.
  if (quote.isBackorder && !input.acceptsBackorder) {
    throw new TyreShopOrderError(
      'invalid_input',
      'Selected tyre is out of stock. Please confirm you accept a 3 working day backorder.',
    );
  }

  const scheduledAt = parseSlotToDate(input.selectedSlot);
  if (!scheduledAt) {
    throw new TyreShopOrderError('invalid_input', 'Selected slot is invalid');
  }

  const customerId = await upsertCustomer(input);
  const locationId =
    input.fittingMethod === 'HOME' && input.address
      ? await insertCustomerLocation(customerId, input.address)
      : null;

  const expectedReadyDate = expectedReadyDateLabel({
    isBackorder: quote.isBackorder,
    backorderEtaWorkingDays: fees.backorderEtaWorkingDays,
    sundaysOpen: fees.sundaysOpen,
  });

  const slotLabel = `${input.selectedSlot.date} ${input.selectedSlot.time}`;
  const inserted = await insertBookingWithRetry({
    customerId,
    locationId,
    tyreId: tyre.id,
    fittingMethod: input.fittingMethod,
    quantity: input.quantity,
    scheduledAt,
    slotLabel,
    isBackorder: quote.isBackorder,
    backorderEtaDays: quote.isBackorder ? fees.backorderEtaWorkingDays : null,
    fittingFeeGbp: quote.priceBreakdown.fittingFeeGbp.toFixed(2),
    distanceFeeGbp: quote.priceBreakdown.distanceFeeGbp.toFixed(2),
    totalGbp: quote.priceBreakdown.totalGbp.toFixed(2),
    wheelNutAnswer: input.wheelNutAnswer,
    ...(input.notes ? { notes: input.notes } : {}),
  });

  const amountPence = toPence(quote.priceBreakdown.totalGbp);
  if (amountPence <= 0) {
    await markBookingFailed(inserted.bookingId);
    throw new TyreShopOrderError('invalid_input', 'Order total is invalid');
  }

  let intent;
  try {
    intent = await createBookingPaymentIntent({
      amountPence,
      currency: 'gbp',
      customerEmail: input.customerEmail,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      receiptEmail: input.customerEmail,
      description: `TyreRepair UK tyre order ${inserted.trackingId}`,
      metadata: {
        bookingId: inserted.bookingId,
        quoteId: '',
        trackingId: inserted.trackingId,
        customerId,
        tyreId: tyre.id,
        jobType: 'REPLACEMENT',
        paymentKind: 'full',
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[tyre-shop/orders] stripe PI failed', err);
    await markBookingFailed(inserted.bookingId);
    throw new TyreShopOrderError('stripe_failed', 'Could not create Stripe PaymentIntent', 502);
  }

  try {
    await db.insert(schema.payments).values({
      bookingId: inserted.bookingId,
      stripePaymentIntentId: intent.paymentIntentId,
      amountGbp: (amountPence / 100).toFixed(2),
      vatAmountGbp: '0.00',
      currency: 'gbp',
      status: 'processing',
      paymentKind: 'full',
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[tyre-shop/orders] payment row insert failed', err);
    await markBookingFailed(inserted.bookingId);
    throw new TyreShopOrderError('db_error', 'Could not record payment', 500);
  }

  return {
    bookingId: inserted.bookingId,
    trackingId: inserted.trackingId,
    clientSecret: intent.clientSecret,
    amountGbp: (amountPence / 100).toFixed(2),
    currency: 'gbp',
    totalGbp: quote.priceBreakdown.totalGbp,
    isBackorder: quote.isBackorder,
    expectedReadyDate,
  };
}
