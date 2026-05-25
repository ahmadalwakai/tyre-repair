/**
 * Global admin search.
 *
 * Searches a small, safe surface (no internal notes, no risk notes, no audit
 * payloads) so the admin can find a job/customer fast from one place.
 *
 * Search fields:
 *  - bookings.trackingId  (case-insensitive prefix/contains)
 *  - customers.phone      (contains, normalised)
 *  - customers.fullName   (contains, case-insensitive)
 *  - quotes.vehicleRegistration (contains, case-insensitive)
 *
 * Read-only. Admin auth required.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  db,
  schema,
  desc,
  eq,
  ilike,
  or,
  type SQL,
} from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const QuerySchema = z.object({
  q: z.string().trim().min(2).max(64),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});

export interface AdminSearchBookingHit {
  bookingId: string;
  trackingId: string;
  status: string;
  paymentStatus: string;
  jobType: string;
  customerName: string | null;
  customerPhone: string | null;
  vehicleRegistration: string | null;
  createdAt: string;
}

export interface AdminSearchCustomerHit {
  customerId: string;
  fullName: string | null;
  phone: string;
  email: string | null;
  bookingsCount: number;
  lastBookingTrackingId: string | null;
  lastBookingId: string | null;
  lastBookingCreatedAt: string | null;
}

export interface AdminSearchResponse {
  q: string;
  bookings: AdminSearchBookingHit[];
  customers: AdminSearchCustomerHit[];
}

function digitsOnly(s: string): string {
  return s.replace(/[^0-9+]/g, '');
}

export async function GET(req: Request): Promise<NextResponse> {
  try {
    await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    q: url.searchParams.get('q') ?? '',
    limit: url.searchParams.get('limit') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
  }
  const { q, limit } = parsed.data;
  const like = `%${q}%`;
  const trackingLike = `%${q.toUpperCase()}%`;
  const phoneLike = `%${digitsOnly(q)}%`;

  // ---- Customers ----------------------------------------------------------
  const customerConds: SQL[] = [];
  customerConds.push(ilike(schema.customers.fullName, like));
  if (digitsOnly(q).length >= 3) {
    customerConds.push(ilike(schema.customers.phone, phoneLike));
  }
  customerConds.push(ilike(schema.customers.email, like));
  const customerWhere = or(...customerConds);

  const customerRows = await db
    .select({
      id: schema.customers.id,
      fullName: schema.customers.fullName,
      phone: schema.customers.phone,
      email: schema.customers.email,
    })
    .from(schema.customers)
    .where(customerWhere)
    .orderBy(desc(schema.customers.createdAt))
    .limit(limit);

  // ---- Bookings (by trackingId) ------------------------------------------
  const bookingByTracking = await db
    .select({
      id: schema.bookings.id,
      trackingId: schema.bookings.trackingId,
      status: schema.bookings.status,
      paymentStatus: schema.bookings.paymentStatus,
      jobType: schema.bookings.jobType,
      createdAt: schema.bookings.createdAt,
      customerId: schema.bookings.customerId,
      quoteId: schema.bookings.quoteId,
    })
    .from(schema.bookings)
    .where(ilike(schema.bookings.trackingId, trackingLike))
    .orderBy(desc(schema.bookings.createdAt))
    .limit(limit);

  // ---- Bookings via quote vehicle registration ---------------------------
  let bookingByVehicle: typeof bookingByTracking = [];
  if (/[a-z0-9]/i.test(q)) {
    bookingByVehicle = await db
      .select({
        id: schema.bookings.id,
        trackingId: schema.bookings.trackingId,
        status: schema.bookings.status,
        paymentStatus: schema.bookings.paymentStatus,
        jobType: schema.bookings.jobType,
        createdAt: schema.bookings.createdAt,
        customerId: schema.bookings.customerId,
        quoteId: schema.bookings.quoteId,
      })
      .from(schema.bookings)
      .leftJoin(schema.quotes, eq(schema.bookings.quoteId, schema.quotes.id))
      .where(ilike(schema.quotes.vehicleRegistration, like))
      .orderBy(desc(schema.bookings.createdAt))
      .limit(limit);
  }

  // ---- Bookings via customer hits ----------------------------------------
  const customerIds = customerRows.map((c) => c.id);
  let bookingByCustomer: typeof bookingByTracking = [];
  if (customerIds.length > 0) {
    bookingByCustomer = await db
      .select({
        id: schema.bookings.id,
        trackingId: schema.bookings.trackingId,
        status: schema.bookings.status,
        paymentStatus: schema.bookings.paymentStatus,
        jobType: schema.bookings.jobType,
        createdAt: schema.bookings.createdAt,
        customerId: schema.bookings.customerId,
        quoteId: schema.bookings.quoteId,
      })
      .from(schema.bookings)
      .where(
        or(...customerIds.map((id) => eq(schema.bookings.customerId, id))) as SQL,
      )
      .orderBy(desc(schema.bookings.createdAt))
      .limit(limit);
  }

  // Merge + dedupe bookings by id, preserve recency.
  const seenBooking = new Set<string>();
  const allBookingRows = [
    ...bookingByTracking,
    ...bookingByVehicle,
    ...bookingByCustomer,
  ].filter((r) => {
    if (seenBooking.has(r.id)) return false;
    seenBooking.add(r.id);
    return true;
  });

  // Hydrate booking customer + vehicle registration for display.
  const customerById = new Map(customerRows.map((c) => [c.id, c] as const));
  const missingCustomerIds = allBookingRows
    .map((r) => r.customerId)
    .filter((id) => !customerById.has(id));
  if (missingCustomerIds.length > 0) {
    const extraCustomers = await db
      .select({
        id: schema.customers.id,
        fullName: schema.customers.fullName,
        phone: schema.customers.phone,
        email: schema.customers.email,
      })
      .from(schema.customers)
      .where(or(...missingCustomerIds.map((id) => eq(schema.customers.id, id))) as SQL);
    for (const c of extraCustomers) customerById.set(c.id, c);
  }

  const quoteIds = allBookingRows
    .map((r) => r.quoteId)
    .filter((v): v is string => typeof v === 'string');
  const vehicleByQuoteId = new Map<string, string | null>();
  if (quoteIds.length > 0) {
    const quoteRows = await db
      .select({
        id: schema.quotes.id,
        vehicleRegistration: schema.quotes.vehicleRegistration,
      })
      .from(schema.quotes)
      .where(or(...quoteIds.map((id) => eq(schema.quotes.id, id))) as SQL);
    for (const qr of quoteRows) vehicleByQuoteId.set(qr.id, qr.vehicleRegistration);
  }

  const bookings: AdminSearchBookingHit[] = allBookingRows.slice(0, limit).map((r) => {
    const customer = customerById.get(r.customerId);
    return {
      bookingId: r.id,
      trackingId: r.trackingId,
      status: r.status,
      paymentStatus: r.paymentStatus,
      jobType: r.jobType,
      customerName: customer?.fullName ?? null,
      customerPhone: customer?.phone ?? null,
      vehicleRegistration: r.quoteId ? (vehicleByQuoteId.get(r.quoteId) ?? null) : null,
      createdAt:
        r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    };
  });

  // ---- Customer hits with last booking summary ---------------------------
  const customers: AdminSearchCustomerHit[] = [];
  for (const c of customerRows) {
    const lastRows = await db
      .select({
        id: schema.bookings.id,
        trackingId: schema.bookings.trackingId,
        createdAt: schema.bookings.createdAt,
      })
      .from(schema.bookings)
      .where(eq(schema.bookings.customerId, c.id))
      .orderBy(desc(schema.bookings.createdAt))
      .limit(1);
    const allRows = await db
      .select({ id: schema.bookings.id })
      .from(schema.bookings)
      .where(eq(schema.bookings.customerId, c.id));
    const last = lastRows[0];
    customers.push({
      customerId: c.id,
      fullName: c.fullName,
      phone: c.phone,
      email: c.email,
      bookingsCount: allRows.length,
      lastBookingTrackingId: last?.trackingId ?? null,
      lastBookingId: last?.id ?? null,
      lastBookingCreatedAt: last
        ? last.createdAt instanceof Date
          ? last.createdAt.toISOString()
          : String(last.createdAt)
        : null,
    });
  }

  const response: AdminSearchResponse = { q, bookings, customers };
  return NextResponse.json(response, { status: 200 });
}
