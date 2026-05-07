import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, eq, and, desc, isNull } from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import { writeAuditLogSafe } from '@/lib/audit/audit-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const idSchema = z.string().uuid();

const NOTE_TYPES = [
  'GENERAL',
  'CUSTOMER_INFO',
  'PAYMENT_INFO',
  'LOCATION_INFO',
  'TYRE_INFO',
  'DISPATCH_NOTE',
  'ISSUE',
] as const;

const createSchema = z.object({
  body: z.string().trim().min(1).max(2000),
  noteType: z.enum(NOTE_TYPES).default('GENERAL'),
  pinned: z.boolean().optional(),
});

interface NoteResponseRow {
  id: string;
  bookingId: string;
  noteType: string;
  body: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  authorEmail: string | null;
  authorName: string | null;
}

async function listNotes(bookingId: string): Promise<NoteResponseRow[]> {
  const rows = await db
    .select({
      id: schema.bookingInternalNotes.id,
      bookingId: schema.bookingInternalNotes.bookingId,
      noteType: schema.bookingInternalNotes.noteType,
      body: schema.bookingInternalNotes.body,
      pinned: schema.bookingInternalNotes.pinned,
      createdAt: schema.bookingInternalNotes.createdAt,
      updatedAt: schema.bookingInternalNotes.updatedAt,
      authorEmail: schema.admins.email,
      authorName: schema.admins.fullName,
    })
    .from(schema.bookingInternalNotes)
    .leftJoin(schema.admins, eq(schema.admins.id, schema.bookingInternalNotes.adminId))
    .where(
      and(
        eq(schema.bookingInternalNotes.bookingId, bookingId),
        isNull(schema.bookingInternalNotes.deletedAt),
      ),
    )
    .orderBy(desc(schema.bookingInternalNotes.pinned), desc(schema.bookingInternalNotes.createdAt));
  return rows.map((r) => ({
    id: r.id,
    bookingId: r.bookingId,
    noteType: r.noteType,
    body: r.body,
    pinned: r.pinned,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    authorEmail: r.authorEmail ?? null,
    authorName: r.authorName ?? null,
  }));
}

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
  try {
    const notes = await listNotes(bookingId);
    return NextResponse.json({ notes });
  } catch {
    return NextResponse.json({ error: 'Could not load notes' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ bookingId: string }> },
): Promise<NextResponse> {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }
  const { bookingId } = await context.params;
  if (!idSchema.safeParse(bookingId).success) {
    return NextResponse.json({ error: 'Invalid bookingId' }, { status: 400 });
  }
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
  // Confirm booking exists
  const exists = await db
    .select({ id: schema.bookings.id })
    .from(schema.bookings)
    .where(eq(schema.bookings.id, bookingId))
    .limit(1);
  if (!exists[0]) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  const inserted = await db
    .insert(schema.bookingInternalNotes)
    .values({
      bookingId,
      adminId: admin.adminId,
      body: parsed.data.body,
      noteType: parsed.data.noteType,
      pinned: parsed.data.pinned ?? false,
    })
    .returning({ id: schema.bookingInternalNotes.id });
  const noteId = inserted[0]?.id;

  await writeAuditLogSafe({
    actorType: 'admin',
    action: 'booking.note.created',
    entityType: 'booking',
    entityId: bookingId,
    bookingId,
    actorAdminId: admin.adminId,
    actorLabel: admin.email,
    metadata: { noteType: parsed.data.noteType, pinned: parsed.data.pinned ?? false },
  });

  const notes = await listNotes(bookingId);
  return NextResponse.json({ noteId, notes }, { status: 201 });
}
