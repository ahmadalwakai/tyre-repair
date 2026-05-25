import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, eq, asc, desc, and, alias } from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import { getBookingPaymentSummary } from '@/lib/payments/payment-summary';
import { getAdminPaymentRisk } from '@/lib/payments/admin-payment-risk';
import { getBookingHealthScore } from '@/lib/bookings/booking-health-score';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const idSchema = z.string().uuid();

export async function GET(
  req: Request,
  context: { params: Promise<{ bookingId: string }> },
): Promise<NextResponse> {
  try {
    await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  const { bookingId } = await context.params;
  if (!idSchema.safeParse(bookingId).success) {
    return NextResponse.json({ error: 'Invalid bookingId' }, { status: 400 });
  }

  let row;
  try {
    const backupTyre = alias(schema.tyreCatalog, 'backup_tyre_admin_detail');
    const rows = await db
      .select({
        bookingId: schema.bookings.id,
        trackingId: schema.bookings.trackingId,
        status: schema.bookings.status,
        paymentStatus: schema.bookings.paymentStatus,
        lockingWheelNutStatus: schema.bookings.lockingWheelNutStatus,
        adminNotes: schema.bookings.adminNotes,
        customerNotes: schema.bookings.customerNotes,
        createdAt: schema.bookings.createdAt,
        confirmedAt: schema.bookings.confirmedAt,
        dispatchedAt: schema.bookings.dispatchedAt,
        onSiteAt: schema.bookings.onSiteAt,
        completedAt: schema.bookings.completedAt,
        cancelledAt: schema.bookings.cancelledAt,
        refundedAt: schema.bookings.refundedAt,
        jobType: schema.bookings.jobType,
        tyreProblemType: schema.bookings.tyreProblemType,
        assessmentFeeGbp: schema.bookings.assessmentFeeGbp,
        source: schema.bookings.source,
        // Buy Tyres scheduled-fitting fields
        fittingMethod: schema.bookings.fittingMethod,
        quantity: schema.bookings.quantity,
        scheduledAt: schema.bookings.scheduledAt,
        slotLabel: schema.bookings.slotLabel,
        isBackorder: schema.bookings.isBackorder,
        backorderEtaDays: schema.bookings.backorderEtaDays,
        fittingFeeGbp: schema.bookings.fittingFeeGbp,
        distanceFeeGbp: schema.bookings.distanceFeeGbp,
        checkoutPaymentMode: schema.bookings.checkoutPaymentMode,
        stockDecrementedAt: schema.bookings.stockDecrementedAt,
        customerName: schema.customers.fullName,
        customerPhone: schema.customers.phone,
        customerEmail: schema.customers.email,
        addressLine1: schema.customerLocations.addressLine1,
        city: schema.customerLocations.city,
        postcode: schema.customerLocations.postcode,
        latitude: schema.customerLocations.latitude,
        longitude: schema.customerLocations.longitude,
        tyreId: schema.tyreCatalog.id,
        tyreBrand: schema.tyreCatalog.brand,
        tyreModel: schema.tyreCatalog.model,
        tyreSize: schema.tyreCatalog.sizeLabel,
        tyreSku: schema.tyreCatalog.sku,
        tyrePriceGbp: schema.tyreCatalog.basePriceGbp,
        tyreStockAvailable: schema.stock.quantityAvailable,
        tyreStockReserved: schema.stock.reservedQuantity,
        tyreStockLowThreshold: schema.stock.lowStockThreshold,
        backupTyreId: backupTyre.id,
        backupTyreBrand: backupTyre.brand,
        backupTyreModel: backupTyre.model,
        backupTyreSize: backupTyre.sizeLabel,
        quoteId: schema.quotes.id,
        totalPriceGbp: schema.quotes.totalPriceGbp,
        basePriceGbp: schema.quotes.basePriceGbp,
        paymentId: schema.payments.id,
        paymentAmount: schema.payments.amountGbp,
        paymentStripeStatus: schema.payments.status,
        paymentPaidAt: schema.payments.paidAt,
      })
      .from(schema.bookings)
      .leftJoin(schema.customers, eq(schema.customers.id, schema.bookings.customerId))
      .leftJoin(
        schema.customerLocations,
        eq(schema.customerLocations.id, schema.bookings.locationId),
      )
      .leftJoin(schema.tyreCatalog, eq(schema.tyreCatalog.id, schema.bookings.tyreId))
      .leftJoin(schema.stock, eq(schema.stock.tyreId, schema.bookings.tyreId))
      .leftJoin(backupTyre, eq(backupTyre.id, schema.bookings.backupTyreId))
      .leftJoin(schema.quotes, eq(schema.quotes.id, schema.bookings.quoteId))
      .leftJoin(schema.payments, eq(schema.payments.bookingId, schema.bookings.id))
      .where(eq(schema.bookings.id, bookingId))
      .limit(1);
    row = rows[0];
  } catch {
    return NextResponse.json({ error: 'Could not load booking' }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  let events: Array<{
    fromStatus: string | null;
    toStatus: string;
    message: string | null;
    createdAt: string;
  }> = [];
  try {
    const evRows = await db
      .select({
        fromStatus: schema.bookingEvents.fromStatus,
        toStatus: schema.bookingEvents.toStatus,
        message: schema.bookingEvents.message,
        createdAt: schema.bookingEvents.createdAt,
      })
      .from(schema.bookingEvents)
      .where(eq(schema.bookingEvents.bookingId, bookingId))
      .orderBy(asc(schema.bookingEvents.createdAt));
    events = evRows.map((e) => ({
      fromStatus: e.fromStatus,
      toStatus: e.toStatus,
      message: e.message,
      createdAt: e.createdAt.toISOString(),
    }));
  } catch {
    events = [];
  }

  // Item 6 — extended sections
  const paymentSummary = await getBookingPaymentSummary(bookingId).catch(() => null);

  const adjustments = await db
    .select({
      id: schema.bookingAdjustments.id,
      type: schema.bookingAdjustments.type,
      status: schema.bookingAdjustments.status,
      originalPaidAmountGbp: schema.bookingAdjustments.originalPaidAmountGbp,
      additionalAmountGbp: schema.bookingAdjustments.additionalAmountGbp,
      totalReplacementAmountGbp: schema.bookingAdjustments.totalReplacementAmountGbp,
      paidAt: schema.bookingAdjustments.paidAt,
      createdAt: schema.bookingAdjustments.createdAt,
      notes: schema.bookingAdjustments.notes,
    })
    .from(schema.bookingAdjustments)
    .where(eq(schema.bookingAdjustments.bookingId, bookingId))
    .orderBy(desc(schema.bookingAdjustments.createdAt));

  const cancellation = (
    await db
      .select({
        id: schema.bookingCancellations.id,
        reason: schema.bookingCancellations.reason,
        stage: schema.bookingCancellations.stage,
        depositDecision: schema.bookingCancellations.depositDecision,
        retainedAmountGbp: schema.bookingCancellations.retainedAmountGbp,
        refundDueGbp: schema.bookingCancellations.refundDueGbp,
        balanceDueGbp: schema.bookingCancellations.balanceDueGbp,
        customerMessage: schema.bookingCancellations.customerMessage,
        internalNotes: schema.bookingCancellations.internalNotes,
        createdAt: schema.bookingCancellations.createdAt,
      })
      .from(schema.bookingCancellations)
      .where(eq(schema.bookingCancellations.bookingId, bookingId))
      .orderBy(desc(schema.bookingCancellations.createdAt))
      .limit(1)
  )[0] ?? null;

  // Contact history — payment links sent + cancellations + audit log entries
  const contactHistory = (
    await db
      .select({
        id: schema.auditLogs.id,
        action: schema.auditLogs.action,
        actorLabel: schema.auditLogs.actorLabel,
        actorType: schema.auditLogs.actorType,
        metadata: schema.auditLogs.metadata,
        createdAt: schema.auditLogs.createdAt,
      })
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.bookingId, bookingId))
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(50)
  ).map((c) => ({
    id: c.id,
    action: c.action,
    actorLabel: c.actorLabel,
    actorType: c.actorType,
    metadata: c.metadata,
    createdAt: c.createdAt.toISOString(),
  }));

  const openAdjustment = adjustments.find((a) => a.status === 'pending_payment') ?? null;

  const risk = paymentSummary
    ? getAdminPaymentRisk({
        summary: paymentSummary,
        bookingStatus: row.status,
        hasOpenAdjustment: !!openAdjustment,
        openAdjustmentDueGbp: openAdjustment?.additionalAmountGbp ?? null,
      })
    : null;

  const NO_ANSWER_RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;
  const hasNoAnswerRecorded = contactHistory.some(
    (c) =>
      c.action === 'booking.no_answer.marked' &&
      Date.now() - new Date(c.createdAt).getTime() < NO_ANSWER_RECENT_WINDOW_MS,
  );
  const contactedRecently = contactHistory.some(
    (c) =>
      (c.action === 'booking.payment_link.sent' ||
        c.action === 'booking.location_request.sent' ||
        c.action === 'booking.tracking_link.sent') &&
      Date.now() - new Date(c.createdAt).getTime() < 60 * 60 * 1000,
  );

  const healthScore = getBookingHealthScore({
    bookingStatus: row.status,
    jobType: (row.jobType ?? 'REPLACEMENT') as 'ASSESSMENT' | 'REPLACEMENT',
    lockingWheelNutStatus: row.lockingWheelNutStatus as 'HAVE_KEY' | 'NO_KEY' | 'STANDARD_ONLY',
    hasGpsLocation: row.latitude != null && row.longitude != null,
    hasAddress: !!row.addressLine1,
    hasNoAnswerRecorded,
    paymentSummary,
    paymentRisk: risk,
    contactedRecently,
  });

  const safetySummary = {
    lockingWheelNutStatus: row.lockingWheelNutStatus,
    lockingNutWarning:
      row.lockingWheelNutStatus === 'NO_KEY'
        ? 'Customer has no locking wheel nut key — confirm before dispatch.'
        : null,
    hasGpsLocation: row.latitude != null && row.longitude != null,
    hasAddress: !!row.addressLine1,
    notesPresent: !!row.adminNotes || !!row.customerNotes,
  };

  const timeline = events.map((e) => ({
    type: 'status_change' as const,
    fromStatus: e.fromStatus,
    toStatus: e.toStatus,
    message: e.message,
    createdAt: e.createdAt,
  }));

  return NextResponse.json({
    booking: {
      bookingId: row.bookingId,
      trackingId: row.trackingId,
      status: row.status,
      paymentStatus: row.paymentStatus,
      lockingWheelNutStatus: row.lockingWheelNutStatus,
      adminNotes: row.adminNotes,
      customerNotes: row.customerNotes,
      jobType: row.jobType ?? 'REPLACEMENT',
      tyreProblemType: row.tyreProblemType ?? null,
      assessmentFeeGbp: row.assessmentFeeGbp ? String(row.assessmentFeeGbp) : null,
      source: row.source ?? null,
      // Buy Tyres scheduled-fitting fields (null for emergency bookings).
      fittingMethod: row.fittingMethod ?? null,
      quantity: row.quantity ?? null,
      scheduledAt: row.scheduledAt ? row.scheduledAt.toISOString() : null,
      slotLabel: row.slotLabel ?? null,
      isBackorder: row.isBackorder ?? null,
      backorderEtaDays: row.backorderEtaDays ?? null,
      fittingFeeGbp: row.fittingFeeGbp ? String(row.fittingFeeGbp) : null,
      distanceFeeGbp: row.distanceFeeGbp ? String(row.distanceFeeGbp) : null,
      checkoutPaymentMode: row.checkoutPaymentMode ?? null,
      stockDecrementedAt: row.stockDecrementedAt ? row.stockDecrementedAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      confirmedAt: row.confirmedAt ? row.confirmedAt.toISOString() : null,
      dispatchedAt: row.dispatchedAt ? row.dispatchedAt.toISOString() : null,
      onSiteAt: row.onSiteAt ? row.onSiteAt.toISOString() : null,
      completedAt: row.completedAt ? row.completedAt.toISOString() : null,
      cancelledAt: row.cancelledAt ? row.cancelledAt.toISOString() : null,
      refundedAt: row.refundedAt ? row.refundedAt.toISOString() : null,
    },
    customer: { name: row.customerName, phone: row.customerPhone, email: row.customerEmail },
    location: row.addressLine1
      ? {
          addressLine1: row.addressLine1,
          city: row.city,
          postcode: row.postcode,
          latitude: row.latitude ? Number(row.latitude) : null,
          longitude: row.longitude ? Number(row.longitude) : null,
        }
      : null,
    tyre: row.tyreId
      ? {
          tyreId: row.tyreId,
          brand: row.tyreBrand,
          model: row.tyreModel,
          sizeLabel: row.tyreSize,
          sku: row.tyreSku,
          basePriceGbp: row.tyrePriceGbp ? Number(row.tyrePriceGbp).toFixed(2) : null,
          stock:
            row.tyreStockAvailable != null
              ? {
                  quantityAvailable: row.tyreStockAvailable,
                  reservedQuantity: row.tyreStockReserved ?? 0,
                  lowStockThreshold: row.tyreStockLowThreshold ?? 0,
                }
              : null,
        }
      : null,
    backupTyre: row.backupTyreId
      ? {
          tyreId: row.backupTyreId,
          brand: row.backupTyreBrand,
          model: row.backupTyreModel,
          sizeLabel: row.backupTyreSize,
        }
      : null,
    quote: row.quoteId
      ? {
          quoteId: row.quoteId,
          basePriceGbp: row.basePriceGbp ? Number(row.basePriceGbp).toFixed(2) : '0.00',
          vatAmountGbp: '0.00',
          totalPriceGbp: row.totalPriceGbp ? Number(row.totalPriceGbp).toFixed(2) : '0.00',
        }
      : null,
    payment: row.paymentId
      ? {
          paymentId: row.paymentId,
          amountGbp: row.paymentAmount ? Number(row.paymentAmount).toFixed(2) : '0.00',
          status: row.paymentStripeStatus,
          paidAt: row.paymentPaidAt ? row.paymentPaidAt.toISOString() : null,
        }
      : null,
    events,
    paymentSummary,
    paymentRisk: risk,
    safetySummary,
    timeline,
    adjustments: adjustments.map((a) => ({
      id: a.id,
      type: a.type,
      status: a.status,
      originalPaidAmountGbp: a.originalPaidAmountGbp,
      additionalAmountGbp: a.additionalAmountGbp,
      totalReplacementAmountGbp: a.totalReplacementAmountGbp,
      paidAt: a.paidAt ? a.paidAt.toISOString() : null,
      createdAt: a.createdAt.toISOString(),
      notes: a.notes,
    })),
    cancellation: cancellation
      ? {
          ...cancellation,
          createdAt: cancellation.createdAt.toISOString(),
        }
      : null,
    contactHistory,
    healthScore,
  });
}
