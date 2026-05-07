import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, eq, and, gte, lt, desc } from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Daily cash reconciliation — Final Safety Pack Bundle D.
 *
 * Strict rules:
 *  - Only payments with status = 'succeeded' count toward "collected".
 *  - "Refund recorded" is a marker only — no Stripe refunds are issued.
 *  - "Deposit retained" is sourced from cancellation rows.
 *  - No VAT calculations.
 *  - Date is treated as Europe/London calendar day. We compute UTC bounds
 *    from the supplied `date` (YYYY-MM-DD) using the London offset for
 *    that day (handles BST / GMT).
 */

const querySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/u, 'Use YYYY-MM-DD')
    .optional(),
});

interface PaymentRow {
  id: string;
  bookingId: string | null;
  amountGbp: string;
  paymentKind: string;
  paidAt: Date | null;
  createdAt: Date;
  status: string;
}

interface CancellationRow {
  bookingId: string;
  retainedAmountGbp: string | null;
  refundDueGbp: string | null;
  depositDecision: string;
  createdAt: Date;
}

interface BookingMetaRow {
  id: string;
  trackingId: string;
  status: string;
  paymentStatus: string;
  jobType: string;
  customerName: string | null;
  balanceDueGbp: string | null;
}

function londonOffsetMinutesForDate(year: number, month: number, day: number): number {
  // Compute London offset (in minutes east of UTC) for noon on the given date.
  // Avoids DST edge cases at midnight.
  const probe = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    timeZoneName: 'shortOffset',
  });
  const parts = fmt.formatToParts(probe);
  const tz = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
  // tz is like "GMT", "GMT+1"
  const m = /GMT([+-]\d+)?/u.exec(tz);
  if (!m || !m[1]) return 0;
  const hours = parseInt(m[1], 10);
  return hours * 60;
}

function dayBoundsLondonUtc(dateStr: string): { fromUtc: Date; toUtc: Date } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(dateStr);
  if (!m) {
    const now = new Date();
    return { fromUtc: now, toUtc: now };
  }
  const y = parseInt(m[1] ?? '0', 10);
  const mo = parseInt(m[2] ?? '0', 10);
  const d = parseInt(m[3] ?? '0', 10);
  const offsetMin = londonOffsetMinutesForDate(y, mo, d);
  const fromUtc = new Date(Date.UTC(y, mo - 1, d, 0, 0, 0) - offsetMin * 60 * 1000);
  const toUtc = new Date(fromUtc.getTime() + 24 * 60 * 60 * 1000);
  return { fromUtc, toUtc };
}

function todayLondonDateString(): string {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(new Date());
  const y = parts.find((p) => p.type === 'year')?.value ?? '1970';
  const mo = parts.find((p) => p.type === 'month')?.value ?? '01';
  const d = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${y}-${mo}-${d}`;
}

function toMoney(n: number): string {
  if (!Number.isFinite(n)) return '0.00';
  return (Math.round(n * 100) / 100).toFixed(2);
}

export async function GET(req: Request): Promise<NextResponse> {
  try {
    await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    date: url.searchParams.get('date') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query', issues: parsed.error.issues }, { status: 400 });
  }
  const dateStr = parsed.data.date ?? todayLondonDateString();
  const { fromUtc, toUtc } = dayBoundsLondonUtc(dateStr);

  // 1) Succeeded payments (use paidAt when present, else createdAt)
  let succeeded: PaymentRow[] = [];
  let failedCount = 0;
  try {
    const rows = await db
      .select({
        id: schema.payments.id,
        bookingId: schema.payments.bookingId,
        amountGbp: schema.payments.amountGbp,
        paymentKind: schema.payments.paymentKind,
        paidAt: schema.payments.paidAt,
        createdAt: schema.payments.createdAt,
        status: schema.payments.status,
      })
      .from(schema.payments)
      .where(
        and(gte(schema.payments.createdAt, fromUtc), lt(schema.payments.createdAt, toUtc)),
      );
    for (const r of rows as PaymentRow[]) {
      if (r.status === 'succeeded') {
        // Re-filter by paidAt window if present
        const at = r.paidAt ?? r.createdAt;
        if (at >= fromUtc && at < toUtc) succeeded.push(r);
      } else if (r.status === 'failed') {
        failedCount += 1;
      }
    }
  } catch {
    return NextResponse.json({ error: 'Could not load payments' }, { status: 500 });
  }

  let fullPayments = 0;
  let depositPayments = 0;
  let balancePayments = 0;
  let adjustmentPayments = 0;
  for (const p of succeeded) {
    const n = Number(p.amountGbp);
    if (!Number.isFinite(n) || n <= 0) continue;
    if (p.paymentKind === 'deposit') depositPayments += n;
    else if (p.paymentKind === 'balance') balancePayments += n;
    else if (p.paymentKind === 'adjustment') adjustmentPayments += n;
    else fullPayments += n;
  }
  const collectedTotal = fullPayments + depositPayments + balancePayments + adjustmentPayments;

  // 2) Cancellations created in window — for retained / refund-marked totals
  let cancellations: CancellationRow[] = [];
  try {
    cancellations = (await db
      .select({
        bookingId: schema.bookingCancellations.bookingId,
        retainedAmountGbp: schema.bookingCancellations.retainedAmountGbp,
        refundDueGbp: schema.bookingCancellations.refundDueGbp,
        depositDecision: schema.bookingCancellations.depositDecision,
        createdAt: schema.bookingCancellations.createdAt,
      })
      .from(schema.bookingCancellations)
      .where(
        and(
          gte(schema.bookingCancellations.createdAt, fromUtc),
          lt(schema.bookingCancellations.createdAt, toUtc),
        ),
      )) as CancellationRow[];
  } catch {
    cancellations = [];
  }
  let depositRetained = 0;
  let refundMarked = 0;
  for (const c of cancellations) {
    const r = Number(c.retainedAmountGbp ?? '0');
    const rf = Number(c.refundDueGbp ?? '0');
    if (Number.isFinite(r) && r > 0) depositRetained += r;
    if (Number.isFinite(rf) && rf > 0) refundMarked += rf;
  }
  const cancelledBookingsCount = cancellations.length;

  // 3) Bookings created in window — for booking counts + items list
  type BookingCountRow = {
    id: string;
    trackingId: string;
    status: string;
    paymentStatus: string;
    jobType: string;
    balanceDueGbp: string | null;
    customerId: string;
  };
  let createdBookings: BookingCountRow[] = [];
  try {
    createdBookings = (await db
      .select({
        id: schema.bookings.id,
        trackingId: schema.bookings.trackingId,
        status: schema.bookings.status,
        paymentStatus: schema.bookings.paymentStatus,
        jobType: schema.bookings.jobType,
        balanceDueGbp: schema.bookings.balanceDueGbp,
        customerId: schema.bookings.customerId,
      })
      .from(schema.bookings)
      .where(
        and(gte(schema.bookings.createdAt, fromUtc), lt(schema.bookings.createdAt, toUtc)),
      )
      .orderBy(desc(schema.bookings.createdAt))) as BookingCountRow[];
  } catch {
    createdBookings = [];
  }

  let paidBookingsCount = 0;
  let depositBookingsCount = 0;
  let assessmentBookingsCount = 0;
  let replacementBookingsCount = 0;
  let outstandingBalance = 0;
  for (const b of createdBookings) {
    if (b.paymentStatus === 'paid') paidBookingsCount += 1;
    if (b.paymentStatus === 'deposit_paid') {
      depositBookingsCount += 1;
      const bal = Number(b.balanceDueGbp ?? '0');
      if (Number.isFinite(bal) && bal > 0) outstandingBalance += bal;
    }
    if (b.jobType === 'ASSESSMENT') assessmentBookingsCount += 1;
    if (b.jobType === 'REPLACEMENT') replacementBookingsCount += 1;
  }

  // 4) Build items[] — bookings touched today (created OR had a payment)
  const touchedBookingIds = new Set<string>();
  for (const b of createdBookings) touchedBookingIds.add(b.id);
  for (const p of succeeded) if (p.bookingId) touchedBookingIds.add(p.bookingId);
  for (const c of cancellations) touchedBookingIds.add(c.bookingId);

  let bookingMeta: BookingMetaRow[] = [];
  if (touchedBookingIds.size > 0) {
    try {
      const rows = await db
        .select({
          id: schema.bookings.id,
          trackingId: schema.bookings.trackingId,
          status: schema.bookings.status,
          paymentStatus: schema.bookings.paymentStatus,
          jobType: schema.bookings.jobType,
          customerName: schema.customers.fullName,
          balanceDueGbp: schema.bookings.balanceDueGbp,
        })
        .from(schema.bookings)
        .leftJoin(schema.customers, eq(schema.customers.id, schema.bookings.customerId));
      bookingMeta = (rows as BookingMetaRow[]).filter((r) => touchedBookingIds.has(r.id));
    } catch {
      bookingMeta = [];
    }
  }
  const bookingMetaById = new Map(bookingMeta.map((b) => [b.id, b]));

  const sumsByBooking = new Map<
    string,
    { paid: number; deposit: number; balance: number; adjustment: number; failed: boolean }
  >();
  for (const p of succeeded) {
    if (!p.bookingId) continue;
    const cur = sumsByBooking.get(p.bookingId) ?? {
      paid: 0,
      deposit: 0,
      balance: 0,
      adjustment: 0,
      failed: false,
    };
    const n = Number(p.amountGbp);
    if (Number.isFinite(n) && n > 0) {
      cur.paid += n;
      if (p.paymentKind === 'deposit') cur.deposit += n;
      else if (p.paymentKind === 'balance') cur.balance += n;
      else if (p.paymentKind === 'adjustment') cur.adjustment += n;
    }
    sumsByBooking.set(p.bookingId, cur);
  }

  const cancellationByBooking = new Map<string, CancellationRow>();
  for (const c of cancellations) cancellationByBooking.set(c.bookingId, c);

  const items = Array.from(touchedBookingIds).map((id) => {
    const meta = bookingMetaById.get(id);
    const sums = sumsByBooking.get(id);
    const c = cancellationByBooking.get(id);
    return {
      bookingId: id,
      trackingId: meta?.trackingId ?? null,
      status: meta?.status ?? null,
      paymentStatus: meta?.paymentStatus ?? null,
      jobType: meta?.jobType ?? null,
      customerName: meta?.customerName ?? null,
      paidGbp: toMoney(sums?.paid ?? 0),
      depositGbp: toMoney(sums?.deposit ?? 0),
      balanceGbp: toMoney(sums?.balance ?? 0),
      adjustmentGbp: toMoney(sums?.adjustment ?? 0),
      balanceDueGbp: meta?.balanceDueGbp ?? null,
      cancellation: c
        ? {
            depositDecision: c.depositDecision,
            retainedGbp: c.retainedAmountGbp ?? null,
            refundDueGbp: c.refundDueGbp ?? null,
          }
        : null,
    };
  });

  return NextResponse.json({
    date: dateStr,
    fromUtc: fromUtc.toISOString(),
    toUtc: toUtc.toISOString(),
    collectedTotalGbp: toMoney(collectedTotal),
    fullPaymentsGbp: toMoney(fullPayments),
    depositPaymentsGbp: toMoney(depositPayments),
    balancePaymentsGbp: toMoney(balancePayments),
    adjustmentPaymentsGbp: toMoney(adjustmentPayments),
    refundMarkedGbp: toMoney(refundMarked),
    depositRetainedGbp: toMoney(depositRetained),
    outstandingBalanceGbp: toMoney(outstandingBalance),
    failedPaymentsCount: failedCount,
    cancelledBookingsCount,
    paidBookingsCount,
    depositBookingsCount,
    assessmentBookingsCount,
    replacementBookingsCount,
    items,
  });
}
