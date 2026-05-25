/**
 * CSV export for the daily report (today screen).
 *
 * Streams a small CSV that summarises today's bookings so the owner can
 * download/share end-of-day. Admin auth required. No secrets exported.
 */
import { db, schema, and, gte, lt, desc, eq } from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import { dayBoundsLondonUtc, todayLondonDateString } from '@/lib/admin/london-day';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function row(values: unknown[]): string {
  return values.map(csvEscape).join(',');
}

export async function GET(req: Request): Promise<Response> {
  try {
    await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }

  const dateStr = todayLondonDateString();
  const { fromUtc, toUtc } = dayBoundsLondonUtc(dateStr);

  const rows = await db
    .select({
      id: schema.bookings.id,
      trackingId: schema.bookings.trackingId,
      status: schema.bookings.status,
      paymentStatus: schema.bookings.paymentStatus,
      jobType: schema.bookings.jobType,
      checkoutPaymentMode: schema.bookings.checkoutPaymentMode,
      lockingWheelNutStatus: schema.bookings.lockingWheelNutStatus,
      depositAmountGbp: schema.bookings.depositAmountGbp,
      balanceDueGbp: schema.bookings.balanceDueGbp,
      source: schema.bookings.source,
      customerId: schema.bookings.customerId,
      quoteId: schema.bookings.quoteId,
      createdAt: schema.bookings.createdAt,
    })
    .from(schema.bookings)
    .where(and(gte(schema.bookings.createdAt, fromUtc), lt(schema.bookings.createdAt, toUtc)))
    .orderBy(desc(schema.bookings.createdAt));

  // Lookup customers + quote totals for each booking (small daily set).
  const customerIds = Array.from(new Set(rows.map((r) => r.customerId)));
  const quoteIds = Array.from(
    new Set(rows.map((r) => r.quoteId).filter((v): v is string => typeof v === 'string')),
  );

  const customerMap = new Map<string, { fullName: string | null; phone: string }>();
  for (const cid of customerIds) {
    const c = await db
      .select({
        id: schema.customers.id,
        fullName: schema.customers.fullName,
        phone: schema.customers.phone,
      })
      .from(schema.customers)
      .where(eq(schema.customers.id, cid))
      .limit(1);
    if (c[0]) customerMap.set(cid, { fullName: c[0].fullName, phone: c[0].phone });
  }

  const quoteMap = new Map<string, { totalPriceGbp: string; vehicleRegistration: string | null }>();
  for (const qid of quoteIds) {
    const q = await db
      .select({
        id: schema.quotes.id,
        totalPriceGbp: schema.quotes.totalPriceGbp,
        vehicleRegistration: schema.quotes.vehicleRegistration,
      })
      .from(schema.quotes)
      .where(eq(schema.quotes.id, qid))
      .limit(1);
    if (q[0]) {
      quoteMap.set(qid, {
        totalPriceGbp: q[0].totalPriceGbp,
        vehicleRegistration: q[0].vehicleRegistration,
      });
    }
  }

  const header = row([
    'date',
    'tracking_id',
    'created_at',
    'status',
    'payment_status',
    'payment_mode',
    'job_type',
    'locking_nut',
    'total_gbp',
    'deposit_gbp',
    'balance_due_gbp',
    'customer_name',
    'customer_phone',
    'vehicle_registration',
    'source',
  ]);

  const lines: string[] = [header];
  for (const r of rows) {
    const c = customerMap.get(r.customerId);
    const q = r.quoteId ? quoteMap.get(r.quoteId) : undefined;
    lines.push(
      row([
        dateStr,
        r.trackingId,
        r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
        r.status,
        r.paymentStatus,
        r.checkoutPaymentMode ?? '',
        r.jobType,
        r.lockingWheelNutStatus ?? '',
        q?.totalPriceGbp ?? '',
        r.depositAmountGbp ?? '',
        r.balanceDueGbp ?? '',
        c?.fullName ?? '',
        c?.phone ?? '',
        q?.vehicleRegistration ?? '',
        r.source ?? '',
      ]),
    );
  }

  const body = lines.join('\n');
  const filename = `tyrerepair-today-${dateStr}.csv`;

  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control': 'no-store',
    },
  });
}
