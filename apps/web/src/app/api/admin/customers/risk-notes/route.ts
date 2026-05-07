import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, eq, and, isNull, desc } from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import { writeAuditLogSafe } from '@/lib/audit/audit-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RISK_NOTE_TYPES = [
  'GENERAL_NOTE',
  'REPEATED_NO_ANSWER',
  'PREVIOUS_NO_SHOW',
  'PREFERS_WHATSAPP',
  'NEEDS_LOCATION_CONFIRMATION',
  'PAYMENT_SENSITIVE',
] as const;

const phoneSchema = z.string().trim().min(7).max(32);

const createSchema = z.object({
  customerPhone: phoneSchema,
  customerId: z.string().uuid().optional(),
  noteType: z.enum(RISK_NOTE_TYPES).default('GENERAL_NOTE'),
  body: z.string().trim().min(1).max(1000),
});

const querySchema = z.object({
  customerPhone: phoneSchema.optional(),
  customerId: z.string().uuid().optional(),
});

function rowToJson(r: {
  id: string;
  customerPhone: string;
  customerId: string | null;
  noteType: string;
  body: string;
  authorEmail: string | null;
  authorName: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: r.id,
    customerPhone: r.customerPhone,
    customerId: r.customerId,
    noteType: r.noteType,
    body: r.body,
    authorEmail: r.authorEmail,
    authorName: r.authorName,
    archivedAt: r.archivedAt ? r.archivedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
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
    customerPhone: url.searchParams.get('customerPhone') ?? undefined,
    customerId: url.searchParams.get('customerId') ?? undefined,
  });
  if (!parsed.success || (!parsed.data.customerPhone && !parsed.data.customerId)) {
    return NextResponse.json(
      { error: 'customerPhone or customerId is required' },
      { status: 400 },
    );
  }
  const where = parsed.data.customerPhone
    ? and(
        eq(schema.customerRiskNotes.customerPhone, parsed.data.customerPhone),
        isNull(schema.customerRiskNotes.archivedAt),
      )
    : and(
        eq(schema.customerRiskNotes.customerId, parsed.data.customerId as string),
        isNull(schema.customerRiskNotes.archivedAt),
      );

  const rows = await db
    .select({
      id: schema.customerRiskNotes.id,
      customerPhone: schema.customerRiskNotes.customerPhone,
      customerId: schema.customerRiskNotes.customerId,
      noteType: schema.customerRiskNotes.noteType,
      body: schema.customerRiskNotes.body,
      archivedAt: schema.customerRiskNotes.archivedAt,
      createdAt: schema.customerRiskNotes.createdAt,
      updatedAt: schema.customerRiskNotes.updatedAt,
      authorEmail: schema.admins.email,
      authorName: schema.admins.fullName,
    })
    .from(schema.customerRiskNotes)
    .leftJoin(schema.admins, eq(schema.admins.id, schema.customerRiskNotes.createdByAdminId))
    .where(where)
    .orderBy(desc(schema.customerRiskNotes.createdAt));

  return NextResponse.json({ notes: rows.map(rowToJson) });
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
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const inserted = await db
    .insert(schema.customerRiskNotes)
    .values({
      customerPhone: parsed.data.customerPhone,
      ...(parsed.data.customerId ? { customerId: parsed.data.customerId } : {}),
      noteType: parsed.data.noteType,
      body: parsed.data.body,
      createdByAdminId: admin.adminId,
    })
    .returning({ id: schema.customerRiskNotes.id });

  const noteId = inserted[0]?.id;
  await writeAuditLogSafe({
    actorType: 'admin',
    action: 'customer.risk_note.created',
    entityType: 'system',
    entityId: noteId ?? null,
    actorAdminId: admin.adminId,
    actorLabel: admin.email,
    metadata: {
      customerPhone: parsed.data.customerPhone,
      noteType: parsed.data.noteType,
    },
  });
  return NextResponse.json({ noteId }, { status: 201 });
}
