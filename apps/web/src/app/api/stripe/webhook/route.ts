import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { db, schema, eq, alias } from '@tyrerepair/db';
import {
  ADMIN_CHANNEL,
  trackingChannelFor,
  triggerRealtimeEvent,
  type BookingAdjustmentPaidPayload,
  type BookingCreatedPayload,
  type BookingStatus,
  type BookingStatusUpdatedPayload,
  type PaymentBalanceSucceededPayload,
  type PaymentDepositSucceededPayload,
  type PaymentFailedPayload,
  type PaymentRefundedPayload,
  type PaymentSucceededPayload,
  type StockLowPayload,
} from '@tyrerepair/realtime';
import {
  StripeWebhookSignatureError,
  verifyStripeWebhook,
} from '@/lib/security/stripe-webhook';
import { decrementStockForPaidBooking } from '@/lib/stock/decrement-stock';
import { sendBookingConfirmationEmail } from '@/lib/email/booking-confirmation';
import { sendBookingConfirmationSms } from '@/lib/sms/booking-sms';
import { siteConfig } from '@/lib/site-config';
import { safeSendAdminNotification } from '@/lib/notifications/send-admin-notification';
import { writeAuditLogSafe } from '@/lib/audit/audit-log';
import type { RealtimeEvent } from '@tyrerepair/realtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface BookingContext {
  paymentId: string;
  paymentKind: string;
  paymentStatus: string;
  bookingId: string;
  trackingId: string;
  bookingStatus: BookingStatus;
  tyreId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  totalPriceGbp: string;
  amountPaidGbp: string;
  tyreBrand: string | null;
  tyreModel: string | null;
  tyreSize: string | null;
  lockingWheelNutStatus: 'HAVE_KEY' | 'NO_KEY' | 'STANDARD_ONLY';
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
  backupTyreBrand: string | null;
  backupTyreModel: string | null;
  backupTyreSize: string | null;
  checkoutPaymentMode: 'FULL' | 'DEPOSIT';
  depositAmountGbp: string | null;
  balanceDueGbp: string | null;
  stockDecrementedAt: Date | null;
  vehicleRegistration: string | null;
  locationAddressLine1: string | null;
  locationCity: string | null;
  locationPostcode: string | null;
  locationLatitude: string | null;
  locationLongitude: string | null;
  quoteCreatedAt: Date | null;
  source: string | null;
  fittingMethod: 'GARAGE' | 'HOME' | null;
  quantity: number | null;
  scheduledAt: Date | null;
  slotLabel: string | null;
  isBackorder: boolean | null;
}

async function loadByPaymentIntentId(
  paymentIntentId: string,
): Promise<BookingContext | null> {
  const backupTyre = alias(schema.tyreCatalog, 'backup_tyre_wh');
  const rows = await db
    .select({
      paymentId: schema.payments.id,
      paymentKind: schema.payments.paymentKind,
      paymentStatus: schema.payments.status,
      paymentAmount: schema.payments.amountGbp,
      bookingId: schema.bookings.id,
      trackingId: schema.bookings.trackingId,
      bookingStatus: schema.bookings.status,
      tyreId: schema.bookings.tyreId,
      customerName: schema.customers.fullName,
      customerPhone: schema.customers.phone,
      customerEmail: schema.customers.email,
      totalPriceGbp: schema.quotes.totalPriceGbp,
      tyreBrand: schema.tyreCatalog.brand,
      tyreModel: schema.tyreCatalog.model,
      tyreSize: schema.tyreCatalog.sizeLabel,
      lockingWheelNutStatus: schema.bookings.lockingWheelNutStatus,
      jobType: schema.bookings.jobType,
      tyreProblemType: schema.bookings.tyreProblemType,
      assessmentFeeGbp: schema.bookings.assessmentFeeGbp,
      backupTyreId: schema.bookings.backupTyreId,
      backupTyreBrand: backupTyre.brand,
      backupTyreModel: backupTyre.model,
      backupTyreSize: backupTyre.sizeLabel,
      checkoutPaymentMode: schema.bookings.checkoutPaymentMode,
      depositAmountGbp: schema.bookings.depositAmountGbp,
      balanceDueGbp: schema.bookings.balanceDueGbp,
      stockDecrementedAt: schema.bookings.stockDecrementedAt,
      vehicleRegistration: schema.quotes.vehicleRegistration,
      locationAddressLine1: schema.customerLocations.addressLine1,
      locationCity: schema.customerLocations.city,
      locationPostcode: schema.customerLocations.postcode,
      locationLatitude: schema.customerLocations.latitude,
      locationLongitude: schema.customerLocations.longitude,
      quoteCreatedAt: schema.quotes.createdAt,
      source: schema.bookings.source,
      fittingMethod: schema.bookings.fittingMethod,
      quantity: schema.bookings.quantity,
      scheduledAt: schema.bookings.scheduledAt,
      slotLabel: schema.bookings.slotLabel,
      isBackorder: schema.bookings.isBackorder,
    })
    .from(schema.payments)
    .leftJoin(schema.bookings, eq(schema.bookings.id, schema.payments.bookingId))
    .leftJoin(schema.customers, eq(schema.customers.id, schema.bookings.customerId))
    .leftJoin(schema.quotes, eq(schema.quotes.id, schema.bookings.quoteId))
    .leftJoin(schema.tyreCatalog, eq(schema.tyreCatalog.id, schema.bookings.tyreId))
    .leftJoin(backupTyre, eq(backupTyre.id, schema.bookings.backupTyreId))
    .leftJoin(
      schema.customerLocations,
      eq(schema.customerLocations.id, schema.bookings.locationId),
    )
    .where(eq(schema.payments.stripePaymentIntentId, paymentIntentId))
    .limit(1);
  const r = rows[0];
  if (!r || !r.bookingId || !r.trackingId) return null;
  return {
    paymentId: r.paymentId,
    paymentKind: r.paymentKind ?? 'full',
    paymentStatus: r.paymentStatus,
    bookingId: r.bookingId,
    trackingId: r.trackingId,
    bookingStatus: r.bookingStatus as BookingStatus,
    tyreId: r.tyreId,
    customerName: r.customerName,
    customerPhone: r.customerPhone,
    customerEmail: r.customerEmail,
    totalPriceGbp: r.totalPriceGbp ? Number(r.totalPriceGbp).toFixed(2) : '0.00',
    amountPaidGbp: r.paymentAmount ? Number(r.paymentAmount).toFixed(2) : '0.00',
    tyreBrand: r.tyreBrand,
    tyreModel: r.tyreModel,
    tyreSize: r.tyreSize,
    lockingWheelNutStatus:
      (r.lockingWheelNutStatus as 'HAVE_KEY' | 'NO_KEY' | 'STANDARD_ONLY' | null) ??
      'STANDARD_ONLY',
    jobType: (r.jobType as 'ASSESSMENT' | 'REPLACEMENT' | null) ?? 'REPLACEMENT',
    tyreProblemType: (r.tyreProblemType as BookingContext['tyreProblemType']) ?? null,
    assessmentFeeGbp: r.assessmentFeeGbp ? String(r.assessmentFeeGbp) : null,
    backupTyreId: r.backupTyreId ?? null,
    backupTyreBrand: r.backupTyreBrand ?? null,
    backupTyreModel: r.backupTyreModel ?? null,
    backupTyreSize: r.backupTyreSize ?? null,
    checkoutPaymentMode: (r.checkoutPaymentMode as 'FULL' | 'DEPOSIT' | null) ?? 'FULL',
    depositAmountGbp: r.depositAmountGbp ? String(r.depositAmountGbp) : null,
    balanceDueGbp: r.balanceDueGbp ? String(r.balanceDueGbp) : null,
    stockDecrementedAt: r.stockDecrementedAt ?? null,
    vehicleRegistration: r.vehicleRegistration ?? null,
    locationAddressLine1: r.locationAddressLine1 ?? null,
    locationCity: r.locationCity ?? null,
    locationPostcode: r.locationPostcode ?? null,
    locationLatitude: r.locationLatitude ? String(r.locationLatitude) : null,
    locationLongitude: r.locationLongitude ? String(r.locationLongitude) : null,
    quoteCreatedAt: r.quoteCreatedAt ?? null,
    source: r.source ?? null,
    fittingMethod: (r.fittingMethod as 'GARAGE' | 'HOME' | null) ?? null,
    quantity: r.quantity ?? null,
    scheduledAt: r.scheduledAt ?? null,
    slotLabel: r.slotLabel ?? null,
    isBackorder: r.isBackorder ?? null,
  };
}

function safeStripeJson(event: Stripe.Event): Record<string, unknown> {
  return {
    id: event.id,
    type: event.type,
    livemode: event.livemode,
    created: event.created,
  };
}

async function safeTrigger(
  channel: string,
  type:
    | 'booking.created'
    | 'booking.status.updated'
    | 'payment.succeeded'
    | 'payment.failed'
    | 'payment.refunded'
    | 'stock.low'
    | 'booking.adjustment.paid'
    | 'payment.deposit.succeeded'
    | 'payment.balance.succeeded',
  payload:
    | BookingCreatedPayload
    | BookingStatusUpdatedPayload
    | PaymentSucceededPayload
    | PaymentFailedPayload
    | PaymentRefundedPayload
    | StockLowPayload
    | BookingAdjustmentPaidPayload
    | PaymentDepositSucceededPayload
    | PaymentBalanceSucceededPayload,
): Promise<void> {
  const event = {
    type,
    payload,
    createdAt: new Date().toISOString(),
  } as RealtimeEvent;
  try {
    // The realtime trigger accepts a discriminated union; type assertion is safe
    // because we constrain `type` and matching `payload` per call site.
    await triggerRealtimeEvent(channel, event as Parameters<typeof triggerRealtimeEvent>[1]);
  } catch {
    // pusher unconfigured / network — must not fail webhook
  }
  // Phase 8: dispatch admin push notification on the SAME admin event.
  // Customer tracking-channel pushes are intentionally suppressed by sending only
  // when the channel is the admin channel.
  if (channel === ADMIN_CHANNEL) {
    await safeSendAdminNotification(event);
  }
}

async function handleAdjustmentPaymentSucceeded(
  adjustmentId: string,
  intent: Stripe.PaymentIntent,
  event: Stripe.Event,
): Promise<void> {
  const rows = await db
    .select({
      id: schema.bookingAdjustments.id,
      status: schema.bookingAdjustments.status,
      additionalAmountGbp: schema.bookingAdjustments.additionalAmountGbp,
      tyreId: schema.bookingAdjustments.tyreId,
      bookingId: schema.bookingAdjustments.bookingId,
      trackingId: schema.bookings.trackingId,
      bookingStatus: schema.bookings.status,
      customerName: schema.customers.fullName,
      customerEmail: schema.customers.email,
      customerPhone: schema.customers.phone,
      lockingWheelNutStatus: schema.bookings.lockingWheelNutStatus,
    })
    .from(schema.bookingAdjustments)
    .leftJoin(schema.bookings, eq(schema.bookings.id, schema.bookingAdjustments.bookingId))
    .leftJoin(schema.customers, eq(schema.customers.id, schema.bookings.customerId))
    .where(eq(schema.bookingAdjustments.id, adjustmentId))
    .limit(1);
  const row = rows[0];
  if (!row || !row.bookingId || !row.trackingId || !row.tyreId) return;
  if (row.status === 'paid') return; // idempotent

  const now = new Date();

  try {
    await db
      .update(schema.payments)
      .set({
        status: 'succeeded',
        paidAt: now,
        rawStripeEvent: safeStripeJson(event),
        updatedAt: now,
      })
      .where(eq(schema.payments.stripePaymentIntentId, intent.id));
  } catch {
    // ignore
  }

  await db
    .update(schema.bookingAdjustments)
    .set({ status: 'paid', paidAt: now, updatedAt: now })
    .where(eq(schema.bookingAdjustments.id, adjustmentId));

  await db
    .update(schema.bookings)
    .set({
      jobType: 'REPLACEMENT',
      tyreId: row.tyreId,
      updatedAt: now,
    })
    .where(eq(schema.bookings.id, row.bookingId));

  const currentStatus = (row.bookingStatus as BookingStatus | null) ?? 'confirmed';
  await db.insert(schema.bookingEvents).values({
    bookingId: row.bookingId,
    fromStatus: currentStatus,
    toStatus: currentStatus,
    message: 'Assessment converted to tyre replacement after additional payment',
  });

  let isSpecialOrder = false;
  try {
    const stockResult = await decrementStockForPaidBooking({
      bookingId: row.bookingId,
      tyreId: row.tyreId,
      paymentId: adjustmentId,
    });
    if (!stockResult.decremented && stockResult.reason === 'special_order') {
      isSpecialOrder = true;
      await writeAuditLogSafe({
        actorType: 'stripe_webhook',
        action: 'stock.skipped.special_order',
        entityType: 'stock',
        bookingId: row.bookingId,
        adjustmentId,
        metadata: { tyreId: row.tyreId, eventId: event.id },
      });
    } else if (!stockResult.decremented) {
      await writeAuditLogSafe({
        actorType: 'stripe_webhook',
        action: stockResult.reason === 'stock_row_missing' ? 'stock.skipped.row_missing' : 'stock.decrement.failed',
        entityType: 'stock',
        bookingId: row.bookingId,
        adjustmentId,
        metadata: { tyreId: row.tyreId, reason: stockResult.reason, eventId: event.id },
      });
    } else {
      await writeAuditLogSafe({
        actorType: 'stripe_webhook',
        action: 'stock.decremented.by_webhook',
        entityType: 'stock',
        bookingId: row.bookingId,
        adjustmentId,
        metadata: {
          tyreId: row.tyreId,
          quantityBefore: stockResult.quantityBefore,
          quantityAfter: stockResult.quantityAfter,
          source: 'adjustment',
          eventId: event.id,
        },
      });
    }
    if (stockResult.decremented && stockResult.lowStockTriggered) {
      const tyreRows = await db
        .select({
          sku: schema.tyreCatalog.sku,
          sizeLabel: schema.tyreCatalog.sizeLabel,
          brand: schema.tyreCatalog.brand,
          model: schema.tyreCatalog.model,
        })
        .from(schema.tyreCatalog)
        .where(eq(schema.tyreCatalog.id, row.tyreId))
        .limit(1);
      const t = tyreRows[0];
      if (t) {
        await writeAuditLogSafe({
          actorType: 'stripe_webhook',
          action: 'stock.low_stock.alert_triggered',
          entityType: 'stock',
          bookingId: row.bookingId,
          metadata: { tyreId: row.tyreId, quantityAvailable: stockResult.quantityAfter },
        });
        await safeTrigger(ADMIN_CHANNEL, 'stock.low', {
          tyreId: row.tyreId,
          sku: t.sku,
          sizeLabel: t.sizeLabel,
          brand: t.brand,
          model: t.model,
          quantityAvailable: stockResult.quantityAfter,
          lowStockThreshold: stockResult.lowStockThreshold,
        } satisfies StockLowPayload);
      }
    }
  } catch {
    // never fail webhook on stock errors
  }

  const amountGbp = (Number(row.additionalAmountGbp) || 0).toFixed(2);
  const adjPayload: BookingAdjustmentPaidPayload = {
    bookingId: row.bookingId,
    trackingId: row.trackingId,
    adjustmentId,
    amountGbp,
    paidAt: now.toISOString(),
  };
  await safeTrigger(ADMIN_CHANNEL, 'booking.adjustment.paid', adjPayload);
  await safeTrigger(trackingChannelFor(row.trackingId), 'booking.adjustment.paid', adjPayload);

  const paySucceeded: PaymentSucceededPayload = {
    bookingId: row.bookingId,
    trackingId: row.trackingId,
    paymentId: adjustmentId,
    amountGbp,
    paidAt: now.toISOString(),
  };
  await safeTrigger(ADMIN_CHANNEL, 'payment.succeeded', paySucceeded);

  if (row.customerEmail) {
    try {
      const tyreRows = await db
        .select({
          brand: schema.tyreCatalog.brand,
          model: schema.tyreCatalog.model,
          sizeLabel: schema.tyreCatalog.sizeLabel,
        })
        .from(schema.tyreCatalog)
        .where(eq(schema.tyreCatalog.id, row.tyreId))
        .limit(1);
      const t = tyreRows[0];
      const tyreLabel = t
        ? [t.brand, t.model, t.sizeLabel].filter(Boolean).join(' ')
        : 'Replacement tyre';
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? siteConfig.baseUrl;
      await sendBookingConfirmationEmail({
        to: row.customerEmail,
        customerName: row.customerName ?? 'Customer',
        trackingId: row.trackingId,
        trackingUrl: `${siteUrl}/track/${row.trackingId}`,
        tyreLabel,
        totalPaidGbp: amountGbp,
        isSpecialOrder,
        lockingWheelNutStatus:
          (row.lockingWheelNutStatus as 'HAVE_KEY' | 'NO_KEY' | 'STANDARD_ONLY' | null) ??
          'STANDARD_ONLY',
        jobType: 'REPLACEMENT',
        tyreProblemType: null,
        assessmentFeeGbp: null,
        backupTyreLabel: null,
      });
    } catch {
      // never fail webhook on email
    }
  }

  if (row.customerPhone) {
    try {
      await sendBookingConfirmationSms({
        to: row.customerPhone,
        customerName: row.customerName,
        trackingId: row.trackingId,
        totalPaidGbp: amountGbp,
        paymentMode: 'FULL',
        balanceDueGbp: null,
      });
    } catch {
      // never fail webhook on SMS
    }
  }
}

async function handleDepositPaymentSucceeded(
  intent: Stripe.PaymentIntent,
  event: Stripe.Event,
): Promise<void> {
  const ctx = await loadByPaymentIntentId(intent.id);
  if (!ctx) return;
  // Idempotency: short-circuit if already processed.
  if (ctx.paymentStatus === 'succeeded') return;

  const now = new Date();

  await db
    .update(schema.payments)
    .set({
      status: 'succeeded',
      paidAt: now,
      rawStripeEvent: safeStripeJson(event),
      updatedAt: now,
    })
    .where(eq(schema.payments.id, ctx.paymentId));

  await db
    .update(schema.bookings)
    .set({
      status: 'confirmed',
      paymentStatus: 'deposit_paid',
      depositPaidAt: now,
      confirmedAt: now,
      updatedAt: now,
    })
    .where(eq(schema.bookings.id, ctx.bookingId));

  await db.insert(schema.bookingEvents).values({
    bookingId: ctx.bookingId,
    fromStatus: 'pending_payment',
    toStatus: 'confirmed',
    message: 'Deposit paid and booking confirmed',
  });

  if (ctx.jobType === 'REPLACEMENT' && ctx.tyreId) {
    // Stock is intentionally NOT decremented for deposit-only payments.
    // It will be decremented after the balance is paid.
    await writeAuditLogSafe({
      actorType: 'stripe_webhook',
      action: 'stock.skipped.deposit_only',
      entityType: 'stock',
      bookingId: ctx.bookingId,
      paymentId: ctx.paymentId,
      metadata: { tyreId: ctx.tyreId, eventId: event.id },
    });
    try {
      await db.insert(schema.bookingEvents).values({
        bookingId: ctx.bookingId,
        fromStatus: 'confirmed',
        toStatus: 'confirmed',
        message: 'Stock not decremented because only deposit was paid',
      });
    } catch {
      // non-fatal
    }
  }

  // Send deposit confirmation email
  if (ctx.customerEmail) {
    const tyreLabel =
      ctx.jobType === 'ASSESSMENT'
        ? 'Emergency tyre assessment'
        : [ctx.tyreBrand, ctx.tyreModel, ctx.tyreSize].filter(Boolean).join(' ') ||
          'Emergency callout';
    const backupTyreLabel =
      ctx.backupTyreBrand && ctx.backupTyreModel && ctx.backupTyreSize
        ? `${ctx.backupTyreBrand} ${ctx.backupTyreModel} (${ctx.backupTyreSize})`
        : null;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? siteConfig.baseUrl;
    try {
      await sendBookingConfirmationEmail({
        to: ctx.customerEmail,
        customerName: ctx.customerName ?? 'Customer',
        trackingId: ctx.trackingId,
        trackingUrl: `${siteUrl}/track/${ctx.trackingId}`,
        tyreLabel,
        totalPaidGbp: ctx.amountPaidGbp,
        isSpecialOrder: false,
        lockingWheelNutStatus: ctx.lockingWheelNutStatus,
        jobType: ctx.jobType,
        tyreProblemType: ctx.tyreProblemType,
        assessmentFeeGbp: ctx.assessmentFeeGbp,
        backupTyreLabel,
        paymentMode: 'DEPOSIT',
        depositAmountGbp: ctx.depositAmountGbp,
        balanceDueGbp: ctx.balanceDueGbp,
        totalPriceGbp: ctx.totalPriceGbp,
        cancellationPolicyUrl: `${siteUrl}/cancellation-policy`,
      });
    } catch {
      // never fail webhook on email
    }
  }

  if (ctx.customerPhone) {
    try {
      await sendBookingConfirmationSms({
        to: ctx.customerPhone,
        customerName: ctx.customerName,
        trackingId: ctx.trackingId,
        totalPaidGbp: ctx.amountPaidGbp,
        paymentMode: 'DEPOSIT',
        balanceDueGbp: ctx.balanceDueGbp,
      });
    } catch {
      // never fail webhook on SMS
    }
  }

  const bookingCreatedPayload: BookingCreatedPayload = {
    bookingId: ctx.bookingId,
    trackingId: ctx.trackingId,
    customerName: ctx.customerName ?? 'Customer',
    phone: ctx.customerPhone ?? '',
    status: 'confirmed',
    paymentStatus: 'deposit_paid',
    totalPriceGbp: ctx.totalPriceGbp,
    createdAt: now.toISOString(),
    lockingWheelNutStatus: ctx.lockingWheelNutStatus,
    jobType: ctx.jobType,
    tyreProblemType: ctx.tyreProblemType,
    assessmentFeeGbp: ctx.assessmentFeeGbp,
    backupTyreId: ctx.backupTyreId,
    customerEmail: ctx.customerEmail,
    vehicleRegistration: ctx.vehicleRegistration,
    locationLabel: [ctx.locationAddressLine1, ctx.locationCity].filter(Boolean).join(', ') || null,
    postcode: ctx.locationPostcode,
    latitude: ctx.locationLatitude ? Number(ctx.locationLatitude) : null,
    longitude: ctx.locationLongitude ? Number(ctx.locationLongitude) : null,
    paymentMode: 'DEPOSIT',
    quoteCreatedAt: ctx.quoteCreatedAt ? ctx.quoteCreatedAt.toISOString() : null,
    source: ctx.source,
    fittingMethod: ctx.fittingMethod,
    quantity: ctx.quantity,
    scheduledAt: ctx.scheduledAt ? ctx.scheduledAt.toISOString() : null,
    slotLabel: ctx.slotLabel,
    isBackorder: ctx.isBackorder,
  };
  await safeTrigger(ADMIN_CHANNEL, 'booking.created', bookingCreatedPayload);

  const depositPayload: PaymentDepositSucceededPayload = {
    bookingId: ctx.bookingId,
    trackingId: ctx.trackingId,
    paymentId: ctx.paymentId,
    depositAmountGbp: ctx.amountPaidGbp,
    balanceDueGbp: ctx.balanceDueGbp ?? '0.00',
    paidAt: now.toISOString(),
  };
  await safeTrigger(ADMIN_CHANNEL, 'payment.deposit.succeeded', depositPayload);

  await writeAuditLogSafe({
    actorType: 'stripe_webhook',
    action: 'payment.succeeded',
    entityType: 'payment',
    entityId: ctx.paymentId,
    paymentId: ctx.paymentId,
    bookingId: ctx.bookingId,
    metadata: {
      paymentKind: 'deposit',
      amountGbp: ctx.amountPaidGbp,
      eventId: event.id,
    },
  });

  const statusUpdatedPayload: BookingStatusUpdatedPayload = {
    bookingId: ctx.bookingId,
    trackingId: ctx.trackingId,
    fromStatus: 'pending_payment',
    toStatus: 'confirmed',
    updatedAt: now.toISOString(),
  };
  await safeTrigger(
    trackingChannelFor(ctx.trackingId),
    'booking.status.updated',
    statusUpdatedPayload,
  );
}

async function handleBalancePaymentSucceeded(
  intent: Stripe.PaymentIntent,
  event: Stripe.Event,
): Promise<void> {
  const ctx = await loadByPaymentIntentId(intent.id);
  if (!ctx) return;
  // Idempotency
  if (ctx.paymentStatus === 'succeeded') return;
  const now = new Date();

  await db
    .update(schema.payments)
    .set({
      status: 'succeeded',
      paidAt: now,
      rawStripeEvent: safeStripeJson(event),
      updatedAt: now,
    })
    .where(eq(schema.payments.id, ctx.paymentId));

  await db
    .update(schema.bookings)
    .set({
      paymentStatus: 'succeeded',
      balanceDueGbp: '0.00',
      updatedAt: now,
    })
    .where(eq(schema.bookings.id, ctx.bookingId));

  await db.insert(schema.bookingEvents).values({
    bookingId: ctx.bookingId,
    fromStatus: ctx.bookingStatus,
    toStatus: ctx.bookingStatus,
    message: 'Balance payment received — booking fully paid',
  });

  // Decrement stock once if not already decremented (for REPLACEMENT bookings)
  if (ctx.jobType === 'REPLACEMENT' && ctx.tyreId && !ctx.stockDecrementedAt) {
    try {
      const stockResult = await decrementStockForPaidBooking({
        bookingId: ctx.bookingId,
        tyreId: ctx.tyreId,
        paymentId: ctx.paymentId,
      });
      if (stockResult.decremented) {
        try {
          await db
            .update(schema.bookings)
            .set({ stockDecrementedAt: now, updatedAt: now })
            .where(eq(schema.bookings.id, ctx.bookingId));
        } catch {
          /* non-fatal */
        }
        await writeAuditLogSafe({
          actorType: 'stripe_webhook',
          action: 'stock.decremented.by_webhook',
          entityType: 'stock',
          bookingId: ctx.bookingId,
          paymentId: ctx.paymentId,
          metadata: {
            tyreId: ctx.tyreId,
            quantityBefore: stockResult.quantityBefore,
            quantityAfter: stockResult.quantityAfter,
            source: 'balance',
            eventId: event.id,
          },
        });
        if (stockResult.lowStockTriggered) {
          try {
            const tyreRows = await db
              .select({
                sku: schema.tyreCatalog.sku,
                sizeLabel: schema.tyreCatalog.sizeLabel,
                brand: schema.tyreCatalog.brand,
                model: schema.tyreCatalog.model,
              })
              .from(schema.tyreCatalog)
              .where(eq(schema.tyreCatalog.id, ctx.tyreId))
              .limit(1);
            const t = tyreRows[0];
            if (t) {
              await safeTrigger(ADMIN_CHANNEL, 'stock.low', {
                tyreId: ctx.tyreId,
                sku: t.sku,
                sizeLabel: t.sizeLabel,
                brand: t.brand,
                model: t.model,
                quantityAvailable: stockResult.quantityAfter,
                lowStockThreshold: stockResult.lowStockThreshold,
              });
            }
          } catch {
            /* non-fatal */
          }
        }
      }
    } catch {
      // never fail webhook on stock errors
    }
  }

  if (ctx.jobType === 'REPLACEMENT' && ctx.tyreId && ctx.stockDecrementedAt) {
    await writeAuditLogSafe({
      actorType: 'stripe_webhook',
      action: 'stock.skipped.already_processed',
      entityType: 'stock',
      bookingId: ctx.bookingId,
      paymentId: ctx.paymentId,
      metadata: { tyreId: ctx.tyreId, source: 'balance', eventId: event.id },
    });
  }

  const balancePayload: PaymentBalanceSucceededPayload = {
    bookingId: ctx.bookingId,
    trackingId: ctx.trackingId,
    paymentId: ctx.paymentId,
    amountGbp: ctx.amountPaidGbp,
    paidAt: now.toISOString(),
  };
  await safeTrigger(ADMIN_CHANNEL, 'payment.balance.succeeded', balancePayload);

  await writeAuditLogSafe({
    actorType: 'stripe_webhook',
    action: 'payment.balance.paid',
    entityType: 'payment',
    entityId: ctx.paymentId,
    paymentId: ctx.paymentId,
    bookingId: ctx.bookingId,
    metadata: { paymentKind: 'balance', amountGbp: ctx.amountPaidGbp, eventId: event.id },
  });

  const paySucceededPayload: PaymentSucceededPayload = {
    bookingId: ctx.bookingId,
    trackingId: ctx.trackingId,
    paymentId: ctx.paymentId,
    amountGbp: ctx.amountPaidGbp,
    paidAt: now.toISOString(),
  };
  await safeTrigger(ADMIN_CHANNEL, 'payment.succeeded', paySucceededPayload);
}

async function handlePaymentSucceeded(intent: Stripe.PaymentIntent, event: Stripe.Event): Promise<void> {
  // Branch: assessment-to-replacement adjustment payment
  const adjustmentId = (intent.metadata?.bookingAdjustmentId ?? '').trim();
  if (adjustmentId) {
    await handleAdjustmentPaymentSucceeded(adjustmentId, intent, event);
    return;
  }

  const paymentKind = (intent.metadata?.paymentKind ?? '').trim().toLowerCase();
  if (paymentKind === 'deposit') {
    await handleDepositPaymentSucceeded(intent, event);
    return;
  }
  if (paymentKind === 'balance') {
    await handleBalancePaymentSucceeded(intent, event);
    return;
  }

  const ctx = await loadByPaymentIntentId(intent.id);
  if (!ctx) return;

  // Idempotency: short-circuit if already succeeded
  if (ctx.paymentStatus === 'succeeded') return;

  const now = new Date();

  await db
    .update(schema.payments)
    .set({
      status: 'succeeded',
      paidAt: now,
      rawStripeEvent: safeStripeJson(event),
      updatedAt: now,
    })
    .where(eq(schema.payments.id, ctx.paymentId));

  await db
    .update(schema.bookings)
    .set({
      status: 'confirmed',
      paymentStatus: 'succeeded',
      confirmedAt: now,
      updatedAt: now,
    })
    .where(eq(schema.bookings.id, ctx.bookingId));

  await db.insert(schema.bookingEvents).values({
    bookingId: ctx.bookingId,
    fromStatus: 'pending_payment',
    toStatus: 'confirmed',
    message: 'Payment succeeded and booking confirmed',
  });

  // Atomic stock decrement (only for REPLACEMENT bookings with tyreId)
  let isSpecialOrder = false;
  if (ctx.jobType === 'REPLACEMENT' && ctx.tyreId) {
    try {
      const stockResult = await decrementStockForPaidBooking({
        bookingId: ctx.bookingId,
        tyreId: ctx.tyreId,
        paymentId: ctx.paymentId,
      });
      if (!stockResult.decremented && stockResult.reason === 'special_order') {
        isSpecialOrder = true;
        await writeAuditLogSafe({
          actorType: 'stripe_webhook',
          action: 'stock.skipped.special_order',
          entityType: 'stock',
          bookingId: ctx.bookingId,
          paymentId: ctx.paymentId,
          metadata: { tyreId: ctx.tyreId, eventId: event.id },
        });
      } else if (!stockResult.decremented) {
        await writeAuditLogSafe({
          actorType: 'stripe_webhook',
          action: stockResult.reason === 'stock_row_missing' ? 'stock.skipped.row_missing' : 'stock.decrement.failed',
          entityType: 'stock',
          bookingId: ctx.bookingId,
          paymentId: ctx.paymentId,
          metadata: { tyreId: ctx.tyreId, reason: stockResult.reason, eventId: event.id },
        });
      }
      if (stockResult.decremented) {
        // Mark booking as having had stock decremented so the balance handler skips re-decrement.
        try {
          await db
            .update(schema.bookings)
            .set({ stockDecrementedAt: now, updatedAt: now })
            .where(eq(schema.bookings.id, ctx.bookingId));
        } catch {
          // non-fatal
        }
        await writeAuditLogSafe({
          actorType: 'stripe_webhook',
          action: 'stock.decremented.by_webhook',
          entityType: 'stock',
          bookingId: ctx.bookingId,
          paymentId: ctx.paymentId,
          metadata: {
            tyreId: ctx.tyreId,
            quantityBefore: stockResult.quantityBefore,
            quantityAfter: stockResult.quantityAfter,
            source: 'full',
            eventId: event.id,
          },
        });
      }
      if (stockResult.decremented && stockResult.lowStockTriggered && ctx.tyreId) {
        // Look up sku/size for stock.low payload
        const tyreRows = await db
          .select({
            sku: schema.tyreCatalog.sku,
            sizeLabel: schema.tyreCatalog.sizeLabel,
            brand: schema.tyreCatalog.brand,
            model: schema.tyreCatalog.model,
          })
          .from(schema.tyreCatalog)
          .where(eq(schema.tyreCatalog.id, ctx.tyreId))
          .limit(1);
        const t = tyreRows[0];
        if (t) {
          const lowPayload: StockLowPayload = {
            tyreId: ctx.tyreId,
            sku: t.sku,
            sizeLabel: t.sizeLabel,
            brand: t.brand,
            model: t.model,
            quantityAvailable: stockResult.quantityAfter,
            lowStockThreshold: stockResult.lowStockThreshold,
          };
          await safeTrigger(ADMIN_CHANNEL, 'stock.low', lowPayload);
        }
      }
    } catch {
      // do not fail webhook on stock errors
    }
  }

  // Send confirmation email (failure must not roll back)
  if (ctx.customerEmail) {
    const tyreLabel =
      ctx.jobType === 'ASSESSMENT'
        ? 'Emergency tyre assessment'
        : [ctx.tyreBrand, ctx.tyreModel, ctx.tyreSize].filter(Boolean).join(' ') ||
          'Emergency callout';
    const backupTyreLabel =
      ctx.backupTyreBrand && ctx.backupTyreModel && ctx.backupTyreSize
        ? `${ctx.backupTyreBrand} ${ctx.backupTyreModel} (${ctx.backupTyreSize})`
        : null;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? siteConfig.baseUrl;
    await sendBookingConfirmationEmail({
      to: ctx.customerEmail,
      customerName: ctx.customerName ?? 'Customer',
      trackingId: ctx.trackingId,
      trackingUrl: `${siteUrl}/track/${ctx.trackingId}`,
      tyreLabel,
      totalPaidGbp: ctx.amountPaidGbp,
      isSpecialOrder,
      lockingWheelNutStatus: ctx.lockingWheelNutStatus,
      jobType: ctx.jobType,
      tyreProblemType: ctx.tyreProblemType,
      assessmentFeeGbp: ctx.assessmentFeeGbp,
      backupTyreLabel,
    });
  }

  if (ctx.customerPhone) {
    try {
      await sendBookingConfirmationSms({
        to: ctx.customerPhone,
        customerName: ctx.customerName,
        trackingId: ctx.trackingId,
        totalPaidGbp: ctx.amountPaidGbp,
        paymentMode: 'FULL',
        balanceDueGbp: null,
      });
    } catch {
      // never fail webhook on SMS
    }
  }

  // Realtime: booking.created + payment.succeeded to admin, status.updated to tracking channel
  const bookingCreatedPayload: BookingCreatedPayload = {
    bookingId: ctx.bookingId,
    trackingId: ctx.trackingId,
    customerName: ctx.customerName ?? 'Customer',
    phone: ctx.customerPhone ?? '',
    status: 'confirmed',
    paymentStatus: 'succeeded',
    totalPriceGbp: ctx.amountPaidGbp,
    createdAt: now.toISOString(),
    lockingWheelNutStatus: ctx.lockingWheelNutStatus,
    jobType: ctx.jobType,
    tyreProblemType: ctx.tyreProblemType,
    assessmentFeeGbp: ctx.assessmentFeeGbp,
    backupTyreId: ctx.backupTyreId,
    customerEmail: ctx.customerEmail,
    vehicleRegistration: ctx.vehicleRegistration,
    locationLabel: [ctx.locationAddressLine1, ctx.locationCity].filter(Boolean).join(', ') || null,
    postcode: ctx.locationPostcode,
    latitude: ctx.locationLatitude ? Number(ctx.locationLatitude) : null,
    longitude: ctx.locationLongitude ? Number(ctx.locationLongitude) : null,
    paymentMode: 'FULL',
    quoteCreatedAt: ctx.quoteCreatedAt ? ctx.quoteCreatedAt.toISOString() : null,
    source: ctx.source,
    fittingMethod: ctx.fittingMethod,
    quantity: ctx.quantity,
    scheduledAt: ctx.scheduledAt ? ctx.scheduledAt.toISOString() : null,
    slotLabel: ctx.slotLabel,
    isBackorder: ctx.isBackorder,
  };
  await safeTrigger(ADMIN_CHANNEL, 'booking.created', bookingCreatedPayload);

  const paymentSucceededPayload: PaymentSucceededPayload = {
    bookingId: ctx.bookingId,
    trackingId: ctx.trackingId,
    paymentId: ctx.paymentId,
    amountGbp: ctx.amountPaidGbp,
    paidAt: now.toISOString(),
  };
  await safeTrigger(ADMIN_CHANNEL, 'payment.succeeded', paymentSucceededPayload);

  await writeAuditLogSafe({
    actorType: 'stripe_webhook',
    action: 'payment.succeeded',
    entityType: 'payment',
    entityId: ctx.paymentId,
    paymentId: ctx.paymentId,
    bookingId: ctx.bookingId,
    metadata: { paymentKind: 'full', amountGbp: ctx.amountPaidGbp, eventId: event.id },
  });

  const statusUpdatedPayload: BookingStatusUpdatedPayload = {
    bookingId: ctx.bookingId,
    trackingId: ctx.trackingId,
    fromStatus: 'pending_payment',
    toStatus: 'confirmed',
    updatedAt: now.toISOString(),
  };
  await safeTrigger(
    trackingChannelFor(ctx.trackingId),
    'booking.status.updated',
    statusUpdatedPayload,
  );
}

async function handlePaymentFailed(intent: Stripe.PaymentIntent, event: Stripe.Event): Promise<void> {
  const ctx = await loadByPaymentIntentId(intent.id);
  if (!ctx) return;
  if (ctx.paymentStatus === 'failed') return;
  const now = new Date();

  await db
    .update(schema.payments)
    .set({
      status: 'failed',
      failedAt: now,
      rawStripeEvent: safeStripeJson(event),
      updatedAt: now,
    })
    .where(eq(schema.payments.id, ctx.paymentId));

  await db
    .update(schema.bookings)
    .set({
      status: 'failed',
      paymentStatus: 'failed',
      updatedAt: now,
    })
    .where(eq(schema.bookings.id, ctx.bookingId));

  await db.insert(schema.bookingEvents).values({
    bookingId: ctx.bookingId,
    fromStatus: ctx.bookingStatus,
    toStatus: 'failed',
    message: 'Payment failed',
  });

  const failedPayload: PaymentFailedPayload = {
    bookingId: ctx.bookingId,
    trackingId: ctx.trackingId,
    paymentId: ctx.paymentId,
    reason: intent.last_payment_error?.message ?? 'Payment failed',
    failedAt: now.toISOString(),
  };
  await safeTrigger(ADMIN_CHANNEL, 'payment.failed', failedPayload);

  await writeAuditLogSafe({
    actorType: 'stripe_webhook',
    action: 'payment.failed',
    entityType: 'payment',
    entityId: ctx.paymentId,
    paymentId: ctx.paymentId,
    bookingId: ctx.bookingId,
    metadata: { reason: failedPayload.reason, eventId: event.id },
  });

  await safeTrigger(
    trackingChannelFor(ctx.trackingId),
    'booking.status.updated',
    {
      bookingId: ctx.bookingId,
      trackingId: ctx.trackingId,
      fromStatus: ctx.bookingStatus,
      toStatus: 'failed',
      updatedAt: now.toISOString(),
    },
  );
}

async function handlePaymentCanceled(intent: Stripe.PaymentIntent, event: Stripe.Event): Promise<void> {
  const ctx = await loadByPaymentIntentId(intent.id);
  if (!ctx) return;
  if (ctx.paymentStatus === 'cancelled') return;
  const now = new Date();

  await db
    .update(schema.payments)
    .set({
      status: 'cancelled',
      failedAt: now,
      rawStripeEvent: safeStripeJson(event),
      updatedAt: now,
    })
    .where(eq(schema.payments.id, ctx.paymentId));

  await db
    .update(schema.bookings)
    .set({
      status: 'cancelled',
      paymentStatus: 'cancelled',
      cancelledAt: now,
      updatedAt: now,
    })
    .where(eq(schema.bookings.id, ctx.bookingId));

  await db.insert(schema.bookingEvents).values({
    bookingId: ctx.bookingId,
    fromStatus: ctx.bookingStatus,
    toStatus: 'cancelled',
    message: 'Payment cancelled',
  });

  await writeAuditLogSafe({
    actorType: 'stripe_webhook',
    action: 'payment.cancelled',
    entityType: 'payment',
    entityId: ctx.paymentId,
    paymentId: ctx.paymentId,
    bookingId: ctx.bookingId,
    metadata: { eventId: event.id },
  });

  await safeTrigger(
    trackingChannelFor(ctx.trackingId),
    'booking.status.updated',
    {
      bookingId: ctx.bookingId,
      trackingId: ctx.trackingId,
      fromStatus: ctx.bookingStatus,
      toStatus: 'cancelled',
      updatedAt: now.toISOString(),
    },
  );
}

async function handleChargeRefunded(charge: Stripe.Charge, event: Stripe.Event): Promise<void> {
  const intentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : null;
  if (!intentId) return;
  const ctx = await loadByPaymentIntentId(intentId);
  if (!ctx) return;
  if (ctx.paymentStatus === 'refunded') return;
  const now = new Date();
  const refundedGbp = ((charge.amount_refunded ?? 0) / 100).toFixed(2);

  await db
    .update(schema.payments)
    .set({
      status: 'refunded',
      refundedAt: now,
      rawStripeEvent: safeStripeJson(event),
      updatedAt: now,
    })
    .where(eq(schema.payments.id, ctx.paymentId));

  await db
    .update(schema.bookings)
    .set({
      status: 'refunded',
      paymentStatus: 'refunded',
      refundedAt: now,
      updatedAt: now,
    })
    .where(eq(schema.bookings.id, ctx.bookingId));

  await db.insert(schema.bookingEvents).values({
    bookingId: ctx.bookingId,
    fromStatus: ctx.bookingStatus,
    toStatus: 'refunded',
    message: 'Payment refunded',
  });

  const refundPayload: PaymentRefundedPayload = {
    bookingId: ctx.bookingId,
    trackingId: ctx.trackingId,
    paymentId: ctx.paymentId,
    amountGbp: refundedGbp,
    refundedAt: now.toISOString(),
  };
  await safeTrigger(ADMIN_CHANNEL, 'payment.refunded', refundPayload);

  await writeAuditLogSafe({
    actorType: 'stripe_webhook',
    action: 'payment.refund.received',
    entityType: 'payment',
    entityId: ctx.paymentId,
    paymentId: ctx.paymentId,
    bookingId: ctx.bookingId,
    metadata: { amountGbp: refundedGbp, eventId: event.id },
  });

  await safeTrigger(
    trackingChannelFor(ctx.trackingId),
    'booking.status.updated',
    {
      bookingId: ctx.bookingId,
      trackingId: ctx.trackingId,
      fromStatus: ctx.bookingStatus,
      toStatus: 'refunded',
      updatedAt: now.toISOString(),
    },
  );
}

export async function POST(req: Request): Promise<NextResponse> {
  // CRITICAL: read raw text BEFORE any JSON parsing.
  const rawBody = await req.text();
  const signature = req.headers.get('stripe-signature');

  let event: Stripe.Event;
  try {
    event = verifyStripeWebhook(rawBody, signature);
  } catch (err) {
    if (err instanceof StripeWebhookSignatureError) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Webhook verification failed' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent, event);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent, event);
        break;
      case 'payment_intent.canceled':
        await handlePaymentCanceled(event.data.object as Stripe.PaymentIntent, event);
        break;
      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge, event);
        break;
      default:
        // Unknown event — accept and ignore safely
        break;
    }
    return NextResponse.json({ received: true }, { status: 200 });
  } catch {
    // Internal handling errors must return 200 only if signature was valid
    // and we want Stripe NOT to retry. Returning 500 lets Stripe retry.
    return NextResponse.json({ error: 'Webhook handler error' }, { status: 500 });
  }
}
