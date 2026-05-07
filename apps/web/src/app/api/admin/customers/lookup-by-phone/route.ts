/**
 * Lookup an existing customer by phone, used by the Quick Booking wizard
 * to surface duplicate customers and their last booking + active risk notes.
 *
 * Read-only. Admin auth required.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, eq, desc, and, isNull } from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const querySchema = z.object({
  phone: z.string().trim().min(7).max(32),
});

export async function GET(req: Request): Promise<NextResponse> {
  try {
    await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({ phone: url.searchParams.get('phone') ?? '' });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid phone' }, { status: 400 });
  }
  const phone = parsed.data.phone;

  const customers = await db
    .select({
      id: schema.customers.id,
      fullName: schema.customers.fullName,
      email: schema.customers.email,
      phone: schema.customers.phone,
      createdAt: schema.customers.createdAt,
    })
    .from(schema.customers)
    .where(eq(schema.customers.phone, phone))
    .limit(1);

  const customer = customers[0];
  if (!customer) {
    return NextResponse.json(
      { found: false, customer: null, lastBooking: null, riskNotes: [] },
      { status: 200 },
    );
  }

  const lastBookings = await db
    .select({
      id: schema.bookings.id,
      trackingId: schema.bookings.trackingId,
      status: schema.bookings.status,
      paymentStatus: schema.bookings.paymentStatus,
      jobType: schema.bookings.jobType,
      createdAt: schema.bookings.createdAt,
    })
    .from(schema.bookings)
    .where(eq(schema.bookings.customerId, customer.id))
    .orderBy(desc(schema.bookings.createdAt))
    .limit(1);

  let bookingsCount = 0;
  try {
    const allBookings = await db
      .select({ id: schema.bookings.id })
      .from(schema.bookings)
      .where(eq(schema.bookings.customerId, customer.id));
    bookingsCount = allBookings.length;
  } catch {
    /* */
  }

  let riskNotes: Array<{ id: string; noteType: string; body: string; createdAt: string }> = [];
  try {
    const rows = await db
      .select({
        id: schema.customerRiskNotes.id,
        noteType: schema.customerRiskNotes.noteType,
        body: schema.customerRiskNotes.body,
        createdAt: schema.customerRiskNotes.createdAt,
      })
      .from(schema.customerRiskNotes)
      .where(
        and(
          eq(schema.customerRiskNotes.customerPhone, phone),
          isNull(schema.customerRiskNotes.archivedAt),
        ),
      )
      .orderBy(desc(schema.customerRiskNotes.createdAt))
      .limit(10);
    riskNotes = rows.map((r) => ({
      id: r.id,
      noteType: r.noteType,
      body: r.body,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    }));
  } catch {
    /* table name might differ */
  }

  return NextResponse.json(
    {
      found: true,
      customer: {
        id: customer.id,
        fullName: customer.fullName,
        email: customer.email,
        phone: customer.phone,
        createdAt:
          customer.createdAt instanceof Date
            ? customer.createdAt.toISOString()
            : String(customer.createdAt),
        bookingsCount,
      },
      lastBooking: lastBookings[0]
        ? {
            id: lastBookings[0].id,
            trackingId: lastBookings[0].trackingId,
            status: lastBookings[0].status,
            paymentStatus: lastBookings[0].paymentStatus,
            jobType: lastBookings[0].jobType,
            createdAt:
              lastBookings[0].createdAt instanceof Date
                ? lastBookings[0].createdAt.toISOString()
                : String(lastBookings[0].createdAt),
          }
        : null,
      riskNotes,
    },
    { status: 200 },
  );
}
