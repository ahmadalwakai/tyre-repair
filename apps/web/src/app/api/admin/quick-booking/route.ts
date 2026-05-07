import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, eq, generateTrackingId } from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import { writeAuditLogSafe } from '@/lib/audit/audit-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const phoneSchema = z.string().trim().min(7).max(32);

const PROBLEM_TYPES = [
  'PUNCTURE_OR_FLAT',
  'DAMAGED_OR_BLOWN_OUT',
  'SLOW_PRESSURE_LOSS',
  'NEEDS_REPLACEMENT',
  'NOT_SURE',
] as const;
const JOB_TYPES = ['ASSESSMENT', 'REPLACEMENT'] as const;
const LOCKING_NUT = ['HAVE_KEY', 'NO_KEY', 'STANDARD_ONLY'] as const;
const PAYMENT_MODES = ['CASH', 'DEPOSIT', 'FULL'] as const;

const moneySchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'must be GBP amount like 89.50');

const bodySchema = z.object({
  customerName: z.string().trim().max(160).optional(),
  customerPhone: phoneSchema,
  customerEmail: z.string().trim().email().max(320).optional(),
  problemType: z.enum(PROBLEM_TYPES).default('NOT_SURE'),
  jobType: z.enum(JOB_TYPES).default('ASSESSMENT'),
  lockingWheelNutStatus: z.enum(LOCKING_NUT).default('STANDARD_ONLY'),
  locationLabel: z.string().trim().max(240).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  source: z.string().trim().max(40).default('ADMIN_QUICK_BOOKING'),
  internalNote: z.string().trim().max(1000).optional(),
  /**
   * Admin-chosen payment plan. CASH = admin collects on site (no Stripe).
   * DEPOSIT/FULL = admin will trigger Stripe Payment Element via the admin
   * payment URL returned from this endpoint.
   */
  paymentMode: z.enum(PAYMENT_MODES).default('CASH'),
  /** Snapshot of the live price quote total (£). Required for DEPOSIT/FULL. */
  totalPriceGbp: moneySchema.optional(),
});

/** Default 15% deposit, mirroring the public flow's createPendingBookingForQuote. */
const DEPOSIT_PERCENTAGE = 0.15;
const MINIMUM_DEPOSIT_GBP = 10;

function calculateDepositAmounts(totalGbp: string): {
  depositAmountGbp: string;
  balanceDueGbp: string;
  depositPercentage: string;
} {
  const total = Number(totalGbp);
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

const TRACKING_ID_RETRIES = 5;

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
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
  const data = parsed.data;

  // Reuse customer by phone or create
  let customerId: string;
  try {
    const existing = await db
      .select({ id: schema.customers.id })
      .from(schema.customers)
      .where(eq(schema.customers.phone, data.customerPhone))
      .limit(1);
    if (existing[0]) {
      customerId = existing[0].id;
      if (data.customerName || data.customerEmail) {
        const updates: Partial<typeof schema.customers.$inferInsert> = {
          updatedAt: new Date(),
        };
        if (data.customerName) updates.fullName = data.customerName;
        if (data.customerEmail) updates.email = data.customerEmail;
        await db.update(schema.customers).set(updates).where(eq(schema.customers.id, customerId));
      }
    } else {
      const inserted = await db
        .insert(schema.customers)
        .values({
          fullName: data.customerName ?? 'Phone customer',
          phone: data.customerPhone,
          email: data.customerEmail ?? null,
        })
        .returning({ id: schema.customers.id });
      const id = inserted[0]?.id;
      if (!id) throw new Error('insert customer failed');
      customerId = id;
    }
  } catch {
    return NextResponse.json({ error: 'Could not create or load customer' }, { status: 500 });
  }

  // Optionally create a location row
  let locationId: string | null = null;
  if (data.locationLabel || (data.latitude != null && data.longitude != null)) {
    try {
      const inserted = await db
        .insert(schema.customerLocations)
        .values({
          customerId,
          captureMethod: data.latitude != null ? 'browser_geolocation' : 'manual_address',
          addressLine1: data.locationLabel ?? null,
          ...(data.latitude != null ? { latitude: String(data.latitude) } : {}),
          ...(data.longitude != null ? { longitude: String(data.longitude) } : {}),
        })
        .returning({ id: schema.customerLocations.id });
      locationId = inserted[0]?.id ?? null;
    } catch {
      /* swallow — admin can attach later */
    }
  }

  // Compute Stripe-bearing money fields when admin chose card payment.
  // CASH bookings keep balanceDueGbp NULL and checkoutPaymentMode='FULL'
  // (no card expected). DEPOSIT/FULL require a price snapshot.
  const totalGbp = data.totalPriceGbp ?? null;
  const wantsCard = data.paymentMode === 'DEPOSIT' || data.paymentMode === 'FULL';
  if (wantsCard && !totalGbp) {
    return NextResponse.json(
      { error: 'totalPriceGbp is required when paymentMode is DEPOSIT or FULL' },
      { status: 400 },
    );
  }
  let depositAmountGbp: string | null = null;
  let balanceDueGbp: string | null = null;
  let depositPercentage: string | null = null;
  let checkoutPaymentMode: 'FULL' | 'DEPOSIT' = 'FULL';
  if (wantsCard && totalGbp) {
    if (data.paymentMode === 'DEPOSIT') {
      const calc = calculateDepositAmounts(totalGbp);
      depositAmountGbp = calc.depositAmountGbp;
      balanceDueGbp = calc.balanceDueGbp;
      depositPercentage = calc.depositPercentage;
      checkoutPaymentMode = 'DEPOSIT';
    } else {
      depositAmountGbp = null;
      // For FULL mode the whole amount is the outstanding balance until paid.
      balanceDueGbp = Number(totalGbp).toFixed(2);
      checkoutPaymentMode = 'FULL';
    }
  }

  // Allocate tracking id
  let bookingId: string | null = null;
  let trackingId: string | null = null;
  for (let attempt = 0; attempt < TRACKING_ID_RETRIES; attempt++) {
    const t = generateTrackingId();
    try {
      const inserted = await db
        .insert(schema.bookings)
        .values({
          trackingId: t,
          customerId,
          locationId,
          jobType: data.jobType,
          tyreProblemType: data.problemType,
          lockingWheelNutStatus: data.lockingWheelNutStatus,
          status: 'pending_payment',
          paymentStatus: 'unpaid',
          source: data.source,
          checkoutPaymentMode,
          ...(depositAmountGbp ? { depositAmountGbp } : {}),
          ...(balanceDueGbp ? { balanceDueGbp } : {}),
          ...(depositPercentage ? { depositPercentage } : {}),
        })
        .returning({ id: schema.bookings.id, trackingId: schema.bookings.trackingId });
      const r = inserted[0];
      if (r) {
        bookingId = r.id;
        trackingId = r.trackingId;
        break;
      }
    } catch {
      /* collision — retry */
    }
  }
  if (!bookingId || !trackingId) {
    return NextResponse.json(
      { error: 'Could not allocate tracking ID' },
      { status: 500 },
    );
  }

  if (data.internalNote) {
    try {
      await db.insert(schema.bookingInternalNotes).values({
        bookingId,
        adminId: admin.adminId,
        body: data.internalNote,
        noteType: 'GENERAL',
        pinned: true,
      });
    } catch {
      /* */
    }
  }

  await writeAuditLogSafe({
    actorType: 'admin',
    action: 'admin.quick_booking.created',
    entityType: 'booking',
    entityId: bookingId,
    bookingId,
    actorAdminId: admin.adminId,
    actorLabel: admin.email,
    metadata: {
      source: data.source,
      problemType: data.problemType,
      jobType: data.jobType,
      hadLocation: locationId != null,
      paymentMode: data.paymentMode,
      ...(totalGbp ? { totalPriceGbp: totalGbp } : {}),
    },
  });

  // Build the admin Stripe payment URL when card payment was chosen. Admin
  // can open this in the device browser to enter card details directly.
  let paymentUrl: string | null = null;
  if (wantsCard) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';
    if (siteUrl) {
      paymentUrl = `${siteUrl.replace(/\/$/, '')}/admin-pay/${bookingId}`;
    }
  }

  return NextResponse.json(
    {
      bookingId,
      trackingId,
      paymentMode: data.paymentMode,
      ...(depositAmountGbp ? { depositAmountGbp } : {}),
      ...(balanceDueGbp ? { balanceDueGbp } : {}),
      ...(paymentUrl ? { paymentUrl } : {}),
    },
    { status: 201 },
  );
}
