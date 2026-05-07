import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  db,
  schema,
  eq,
  and,
  or,
  desc,
  inArray,
  gte,
  lte,
  ilike,
  alias,
  type SQL,
  sql,
} from '@tyrerepair/db';
import {
  ADMIN_CHANNEL,
  triggerRealtimeEvent,
  type BookingCreatedPayload,
  type BookingStatus,
  type PaymentStatus,
} from '@tyrerepair/realtime';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import { writeAuditLogSafe } from '@/lib/audit/audit-log';
import { generateTrackingId } from '@tyrerepair/db';
import { safeSendAdminNotification } from '@/lib/notifications/send-admin-notification';
import { evaluateBookingPricingSafetyAsync } from '@/lib/pricing/booking-safety';
import { upsertPricingReviewItem } from '@/lib/action-queue/pricing-review';
import type { ActionQueueSuggestedPayment } from '@/lib/action-queue/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const OPEN_STATUSES: BookingStatus[] = [
  'pending_payment',
  'confirmed',
  'dispatching',
  'dispatched',
  'on_site',
];

const STATUS_VALUES: BookingStatus[] = [
  'pending_payment',
  'confirmed',
  'dispatching',
  'dispatched',
  'on_site',
  'completed',
  'cancelled',
  'refunded',
  'failed',
];

const LOCKING_NUT_VALUES = ['HAVE_KEY', 'NO_KEY', 'STANDARD_ONLY'] as const;
type LockingNutValue = (typeof LOCKING_NUT_VALUES)[number];

const querySchema = z.object({
  status: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  search: z.string().trim().min(1).max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().datetime().optional(),
  lockingWheelNutStatus: z.string().optional(),
  // Item 12 — extended filters
  q: z.string().trim().min(1).max(120).optional(),
  trackingId: z.string().trim().min(1).max(32).optional(),
  customerPhone: z.string().trim().min(1).max(40).optional(),
  customerName: z.string().trim().min(1).max(120).optional(),
  bookingStatus: z.string().optional(),
  paymentStatus: z.string().optional(),
  jobType: z.enum(['ASSESSMENT', 'REPLACEMENT']).optional(),
  assessmentOnly: z.coerce.boolean().optional(),
  replacementOnly: z.coerce.boolean().optional(),
  missingLockingNutKey: z.coerce.boolean().optional(),
  depositPaid: z.coerce.boolean().optional(),
  balanceDue: z.coerce.boolean().optional(),
  paymentFailed: z.coerce.boolean().optional(),
  callbackRequested: z.coerce.boolean().optional(),
  cancelled: z.coerce.boolean().optional(),
  completed: z.coerce.boolean().optional(),
  createdFrom: z.string().datetime().optional(),
  createdTo: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

const createSchema = z.object({
  customerName: z.string().trim().min(2).max(160),
  customerPhone: z.string().trim().regex(/^\+?[0-9 ()-]{6,20}$/),
  customerEmail: z.string().trim().toLowerCase().email().max(320).optional(),
  vehicleRegistration: z.string().trim().min(1).max(16).optional(),
  tyreId: z.string().uuid().optional(),
  manualTyreSize: z.string().trim().min(2).max(32).optional(),
  addressText: z.string().trim().min(2).max(400).optional(),
  notes: z.string().trim().max(2000).optional(),
  confirmNow: z.boolean().optional(),
});

export async function GET(req: Request): Promise<NextResponse> {
  try {
    await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  const url = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query', issues: parsed.error.issues }, { status: 400 });
  }
  const q = parsed.data;

  const filters: SQL[] = [];
  if (q.status) {
    const statuses = q.status
      .split(',')
      .map((s) => s.trim())
      .filter((s): s is BookingStatus => (STATUS_VALUES as string[]).includes(s));
    if (statuses.length > 0) {
      filters.push(inArray(schema.bookings.status, statuses));
    }
  } else {
    filters.push(inArray(schema.bookings.status, OPEN_STATUSES));
  }
  if (q.from) filters.push(gte(schema.bookings.createdAt, new Date(q.from)));
  if (q.to) filters.push(lte(schema.bookings.createdAt, new Date(q.to)));
  if (q.lockingWheelNutStatus) {
    const values = q.lockingWheelNutStatus
      .split(',')
      .map((s) => s.trim())
      .filter((s): s is LockingNutValue =>
        (LOCKING_NUT_VALUES as readonly string[]).includes(s),
      );
    if (values.length > 0) {
      filters.push(inArray(schema.bookings.lockingWheelNutStatus, values));
    }
  }
  if (q.cursor) filters.push(lte(schema.bookings.createdAt, new Date(q.cursor)));

  // Item 12 — extended filters
  if (q.trackingId) {
    filters.push(ilike(schema.bookings.trackingId, `%${q.trackingId}%`));
  }
  if (q.customerPhone) {
    filters.push(ilike(schema.customers.phone, `%${q.customerPhone}%`));
  }
  if (q.customerName) {
    filters.push(ilike(schema.customers.fullName, `%${q.customerName}%`));
  }
  if (q.bookingStatus) {
    const statuses = q.bookingStatus
      .split(',')
      .map((s) => s.trim())
      .filter((s): s is BookingStatus => (STATUS_VALUES as string[]).includes(s));
    if (statuses.length > 0) filters.push(inArray(schema.bookings.status, statuses));
  }
  if (q.paymentStatus) {
    const PAYMENT_VALUES: PaymentStatus[] = [
      'unpaid', 'requires_payment_method', 'requires_action', 'processing',
      'succeeded', 'failed', 'cancelled', 'refunded', 'deposit_paid',
    ];
    const ps = q.paymentStatus
      .split(',')
      .map((s) => s.trim())
      .filter((s): s is PaymentStatus => (PAYMENT_VALUES as string[]).includes(s));
    if (ps.length > 0) filters.push(inArray(schema.bookings.paymentStatus, ps));
  }
  if (q.jobType) filters.push(eq(schema.bookings.jobType, q.jobType));
  if (q.assessmentOnly) filters.push(eq(schema.bookings.jobType, 'ASSESSMENT'));
  if (q.replacementOnly) filters.push(eq(schema.bookings.jobType, 'REPLACEMENT'));
  if (q.missingLockingNutKey) {
    filters.push(eq(schema.bookings.lockingWheelNutStatus, 'NO_KEY'));
  }
  if (q.depositPaid) filters.push(eq(schema.bookings.paymentStatus, 'deposit_paid'));
  if (q.balanceDue) {
    filters.push(eq(schema.bookings.paymentStatus, 'deposit_paid'));
    filters.push(sql`COALESCE(${schema.bookings.balanceDueGbp}::numeric, 0) > 0`);
  }
  if (q.paymentFailed) filters.push(eq(schema.bookings.paymentStatus, 'failed'));
  if (q.cancelled) filters.push(eq(schema.bookings.status, 'cancelled'));
  if (q.completed) filters.push(eq(schema.bookings.status, 'completed'));
  if (q.createdFrom) filters.push(gte(schema.bookings.createdAt, new Date(q.createdFrom)));
  if (q.createdTo) filters.push(lte(schema.bookings.createdAt, new Date(q.createdTo)));
  if (q.q) {
    const like = `%${q.q}%`;
    const clause = or(
      ilike(schema.bookings.trackingId, like),
      ilike(schema.customers.phone, like),
      ilike(schema.customers.fullName, like),
      ilike(schema.customers.email, like),
    );
    if (clause) filters.push(clause);
  }
  if (q.search) {
    const like = `%${q.search}%`;
    const searchClause = or(
      ilike(schema.bookings.trackingId, like),
      ilike(schema.customers.phone, like),
      ilike(schema.customers.fullName, like),
    );
    if (searchClause) filters.push(searchClause);
  }
  const where = filters.length > 0 ? and(...filters) : undefined;

  let rows;
  let totalCount: number | null = null;
  const usePagination = q.page != null || q.pageSize != null;
  const pageSize = q.pageSize ?? q.limit;
  const page = q.page ?? 1;
  const offset = usePagination ? (page - 1) * pageSize : 0;
  try {
    const backupTyre = alias(schema.tyreCatalog, 'backup_tyre_admin_list');
    const baseQuery = db
      .select({
        bookingId: schema.bookings.id,
        trackingId: schema.bookings.trackingId,
        status: schema.bookings.status,
        paymentStatus: schema.bookings.paymentStatus,
        createdAt: schema.bookings.createdAt,
        updatedAt: schema.bookings.updatedAt,
        customerName: schema.customers.fullName,
        customerPhone: schema.customers.phone,
        customerEmail: schema.customers.email,
        tyreBrand: schema.tyreCatalog.brand,
        tyreModel: schema.tyreCatalog.model,
        tyreSize: schema.tyreCatalog.sizeLabel,
        addressLine1: schema.customerLocations.addressLine1,
        city: schema.customerLocations.city,
        postcode: schema.customerLocations.postcode,
        totalPriceGbp: schema.quotes.totalPriceGbp,
        lockingWheelNutStatus: schema.bookings.lockingWheelNutStatus,
        jobType: schema.bookings.jobType,
        tyreProblemType: schema.bookings.tyreProblemType,
        assessmentFeeGbp: schema.bookings.assessmentFeeGbp,
        balanceDueGbp: schema.bookings.balanceDueGbp,
        depositAmountGbp: schema.bookings.depositAmountGbp,
        backupTyreBrand: backupTyre.brand,
        backupTyreModel: backupTyre.model,
        backupTyreSize: backupTyre.sizeLabel,
      })
      .from(schema.bookings)
      .leftJoin(schema.customers, eq(schema.customers.id, schema.bookings.customerId))
      .leftJoin(schema.tyreCatalog, eq(schema.tyreCatalog.id, schema.bookings.tyreId))
      .leftJoin(
        schema.customerLocations,
        eq(schema.customerLocations.id, schema.bookings.locationId),
      )
      .leftJoin(schema.quotes, eq(schema.quotes.id, schema.bookings.quoteId))
      .leftJoin(backupTyre, eq(backupTyre.id, schema.bookings.backupTyreId))
      .where(where)
      .orderBy(desc(schema.bookings.createdAt));

    if (usePagination) {
      rows = await baseQuery.limit(pageSize).offset(offset);
      const [countRow] = await db
        .select({ c: sql<number>`count(*)::int` })
        .from(schema.bookings)
        .leftJoin(schema.customers, eq(schema.customers.id, schema.bookings.customerId))
        .where(where);
      totalCount = countRow?.c ?? 0;
    } else {
      rows = await baseQuery.limit(q.limit + 1);
    }
  } catch {
    return NextResponse.json({ error: 'Could not load bookings' }, { status: 500 });
  }

  const sliceLimit = usePagination ? rows.length : Math.min(rows.length, q.limit);
  const items = rows.slice(0, sliceLimit).map((r) => ({
    bookingId: r.bookingId,
    trackingId: r.trackingId,
    status: r.status,
    paymentStatus: r.paymentStatus,
    customer: { name: r.customerName, phone: r.customerPhone, email: r.customerEmail },
    tyre:
      r.tyreBrand && r.tyreModel && r.tyreSize
        ? { brand: r.tyreBrand, model: r.tyreModel, sizeLabel: r.tyreSize }
        : null,
    backupTyre:
      r.backupTyreBrand && r.backupTyreModel && r.backupTyreSize
        ? { brand: r.backupTyreBrand, model: r.backupTyreModel, sizeLabel: r.backupTyreSize }
        : null,
    location: r.addressLine1
      ? { addressLine1: r.addressLine1, city: r.city, postcode: r.postcode }
      : null,
    totalPriceGbp: r.totalPriceGbp ? Number(r.totalPriceGbp).toFixed(2) : null,
    balanceDueGbp: r.balanceDueGbp ? Number(r.balanceDueGbp).toFixed(2) : null,
    depositAmountGbp: r.depositAmountGbp ? Number(r.depositAmountGbp).toFixed(2) : null,
    lockingWheelNutStatus: r.lockingWheelNutStatus,
    jobType: r.jobType ?? 'REPLACEMENT',
    tyreProblemType: r.tyreProblemType ?? null,
    assessmentFeeGbp: r.assessmentFeeGbp ? String(r.assessmentFeeGbp) : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  if (usePagination) {
    const total = totalCount ?? items.length;
    return NextResponse.json({
      data: items,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  }

  const nextCursor =
    rows.length > q.limit ? rows[q.limit]?.createdAt.toISOString() ?? null : null;

  return NextResponse.json({ items, nextCursor });
}

async function upsertCustomerByPhone(input: {
  fullName: string;
  phone: string;
  email: string | null;
}): Promise<string> {
  const found = await db
    .select({ id: schema.customers.id })
    .from(schema.customers)
    .where(eq(schema.customers.phone, input.phone))
    .limit(1);
  const existing = found[0];
  if (existing) {
    await db
      .update(schema.customers)
      .set({
        fullName: input.fullName,
        email: input.email,
        updatedAt: new Date(),
      })
      .where(eq(schema.customers.id, existing.id));
    return existing.id;
  }
  const inserted = await db
    .insert(schema.customers)
    .values({
      fullName: input.fullName,
      phone: input.phone,
      email: input.email,
    })
    .returning({ id: schema.customers.id });
  const id = inserted[0]?.id;
  if (!id) throw new Error('Could not create customer');
  return id;
}

async function insertManualBooking(input: {
  customerId: string;
  tyreId: string | null;
  locationId: string | null;
  quoteId: string | null;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  notes: string | null;
}): Promise<{ bookingId: string; trackingId: string }> {
  for (let i = 0; i < 5; i++) {
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
          status: input.status,
          paymentStatus: input.paymentStatus,
          adminNotes: input.notes,
          confirmedAt: input.status === 'confirmed' ? new Date() : null,
        })
        .returning({ id: schema.bookings.id, trackingId: schema.bookings.trackingId });
      const created = inserted[0];
      if (created) return { bookingId: created.id, trackingId: created.trackingId };
    } catch {
      continue;
    }
  }
  throw new Error('Could not allocate tracking ID');
}

export async function POST(req: Request): Promise<NextResponse> {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
  }
  const d = parsed.data;

  let customerId: string;
  try {
    customerId = await upsertCustomerByPhone({
      fullName: d.customerName,
      phone: d.customerPhone,
      email: d.customerEmail ?? null,
    });
  } catch {
    return NextResponse.json({ error: 'Could not save customer' }, { status: 500 });
  }

  let locationId: string | null = null;
  if (d.addressText) {
    try {
      const inserted = await db
        .insert(schema.customerLocations)
        .values({
          customerId,
          captureMethod: 'manual_address',
          addressLine1: d.addressText,
          city: null,
          postcode: null,
          country: 'United Kingdom',
        })
        .returning({ id: schema.customerLocations.id });
      locationId = inserted[0]?.id ?? null;
    } catch {
      locationId = null;
    }
  }

  let quoteId: string | null = null;
  let totalPriceForPayload = '0.00';
  if (d.tyreId) {
    try {
      const tyreRows = await db
        .select({
          id: schema.tyreCatalog.id,
          basePriceGbp: schema.tyreCatalog.basePriceGbp,
        })
        .from(schema.tyreCatalog)
        .where(eq(schema.tyreCatalog.id, d.tyreId))
        .limit(1);
      const tyre = tyreRows[0];
      if (tyre) {
        const base = Number(tyre.basePriceGbp);
        // Business is not VAT registered — always zero VAT.
        const total = base;
        totalPriceForPayload = total.toFixed(2);
        const insertedQuotes = await db
          .insert(schema.quotes)
          .values({
            customerId,
            locationId,
            tyreId: tyre.id,
            vehicleRegistration: d.vehicleRegistration ?? null,
            basePriceGbp: base.toFixed(2),
            finalPriceGbp: base.toFixed(2),
            vatAmountGbp: '0.00',
            totalPriceGbp: total.toFixed(2),
            distanceMiles: null,
            pricingBreakdown: { source: 'admin_manual' } as Record<string, unknown>,
            expiresAt: new Date(Date.now() + 30 * 60_000),
          })
          .returning({ id: schema.quotes.id });
        quoteId = insertedQuotes[0]?.id ?? null;
      }
    } catch {
      quoteId = null;
    }
  }

  const status: BookingStatus = d.confirmNow ? 'confirmed' : 'pending_payment';
  const paymentStatus: PaymentStatus = 'unpaid';

  let booking;
  try {
    booking = await insertManualBooking({
      customerId,
      tyreId: d.tyreId ?? null,
      locationId,
      quoteId,
      status,
      paymentStatus,
      notes: d.notes ?? null,
    });
  } catch {
    return NextResponse.json({ error: 'Could not create booking' }, { status: 500 });
  }

  try {
    await db.insert(schema.bookingEvents).values({
      bookingId: booking.bookingId,
      fromStatus: null,
      toStatus: status,
      message: d.confirmNow ? 'Manual booking confirmed by admin' : 'Manual booking draft created',
      createdByAdminId: admin.adminId,
      metadata: sql`'{}'::jsonb`,
    });
  } catch {
    // non-fatal
  }

  try {
    const payload: BookingCreatedPayload = {
      bookingId: booking.bookingId,
      trackingId: booking.trackingId,
      customerName: d.customerName,
      phone: d.customerPhone,
      status,
      paymentStatus,
      totalPriceGbp: totalPriceForPayload,
      createdAt: new Date().toISOString(),
    };
    const event = {
      type: 'booking.created' as const,
      payload,
      createdAt: new Date().toISOString(),
    };
    try {
      await triggerRealtimeEvent(ADMIN_CHANNEL, event);
    } catch {
      // pusher unconfigured; swallow
    }
    await safeSendAdminNotification(event);
  } catch {
    // pusher unconfigured; swallow
  }

  await writeAuditLogSafe({
    actorType: 'admin',
    action: 'booking.created.by_admin',
    entityType: 'booking',
    entityId: booking.bookingId,
    bookingId: booking.bookingId,
    actorAdminId: admin.adminId,
    actorLabel: admin.email,
    metadata: {
      trackingId: booking.trackingId,
      hasTyreId: !!d.tyreId,
    },
  });

  // Action queue: surface HIGH_RISK / BLOCK_PUBLIC_PAYMENT bookings as
  // PRICING_REVIEW_REQUIRED items. Idempotent — re-saving the same booking
  // updates the existing OPEN row instead of creating a duplicate. Failures
  // here MUST NOT fail the booking create.
  try {
    let lat: number | null = null;
    let lng: number | null = null;
    let hasConfirmedAddress = false;
    if (locationId) {
      const locRows = await db
        .select({
          latitude: schema.customerLocations.latitude,
          longitude: schema.customerLocations.longitude,
          addressLine1: schema.customerLocations.addressLine1,
          postcode: schema.customerLocations.postcode,
        })
        .from(schema.customerLocations)
        .where(eq(schema.customerLocations.id, locationId))
        .limit(1);
      const lr = locRows[0];
      if (lr) {
        lat = lr.latitude !== null ? Number(lr.latitude) : null;
        lng = lr.longitude !== null ? Number(lr.longitude) : null;
        hasConfirmedAddress = Boolean(lr.addressLine1 && lr.postcode);
      }
    }
    const { safety } = await evaluateBookingPricingSafetyAsync({
      jobType: 'REPLACEMENT',
      totalPriceGbp: totalPriceForPayload,
      latitude: lat,
      longitude: lng,
      hasConfirmedAddress,
      lockingWheelNutStatus: null,
      paymentMode: null,
    });
    if (safety.level === 'HIGH_RISK' || safety.level === 'BLOCK_PUBLIC_PAYMENT') {
      const suggestedPayment: ActionQueueSuggestedPayment | null =
        safety.recommendedPaymentMode === 'DEPOSIT'
          ? 'DEPOSIT_15'
          : safety.recommendedPaymentMode === 'FULL'
            ? 'FULL'
            : safety.recommendedPaymentMode === 'CASH'
              ? 'CASH'
              : safety.recommendedPaymentMode === 'MANUAL_REVIEW'
                ? 'MANUAL_REVIEW'
                : null;
      await upsertPricingReviewItem({
        bookingId: booking.bookingId,
        safetyLevel: safety.level,
        reasons: safety.reasons,
        suggestedPayment,
        recommendedNextSteps: safety.adminRecommendedNextSteps,
      });
    }
  } catch (err) {
    // Action queue write must never block booking creation. Log so the
    // failure shows up in server logs / observability without surfacing a
    // 500 to the admin app.
    console.error(
      '[admin/bookings] upsertPricingReviewItem failed for booking',
      booking.bookingId,
      err,
    );
  }

  return NextResponse.json(
    { bookingId: booking.bookingId, trackingId: booking.trackingId, status, paymentStatus },
    { status: 201 },
  );
}
