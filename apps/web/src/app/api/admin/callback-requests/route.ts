import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, desc, eq } from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import { writeAuditLogSafe } from '@/lib/audit/audit-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATUSES = ['new', 'contacted', 'converted', 'closed'] as const;
export type CallbackRequestStatus = (typeof STATUSES)[number];

interface CallbackRequestRow {
  id: string;
  fullName: string | null;
  phone: string;
  email: string | null;
  tyreProblemType: string | null;
  message: string | null;
  sourcePage: string | null;
  source: string | null;
  locationLabel: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export async function GET(req: Request): Promise<NextResponse> {
  try {
    await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  const url = new URL(req.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 25), 1), 100);

  let rows: CallbackRequestRow[];
  try {
    const dbRows = await db
      .select({
        id: schema.callbackRequests.id,
        fullName: schema.callbackRequests.fullName,
        phone: schema.callbackRequests.phone,
        email: schema.callbackRequests.email,
        tyreProblemType: schema.callbackRequests.tyreProblemType,
        message: schema.callbackRequests.message,
        sourcePage: schema.callbackRequests.sourcePage,
        source: schema.callbackRequests.source,
        locationLabel: schema.callbackRequests.locationLabel,
        latitude: schema.callbackRequests.latitude,
        longitude: schema.callbackRequests.longitude,
        status: schema.callbackRequests.status,
        createdAt: schema.callbackRequests.createdAt,
        updatedAt: schema.callbackRequests.updatedAt,
      })
      .from(schema.callbackRequests)
      .orderBy(desc(schema.callbackRequests.createdAt))
      .limit(limit);
    rows = dbRows.map((r) => ({
      id: r.id,
      fullName: r.fullName,
      phone: r.phone,
      email: r.email,
      tyreProblemType: r.tyreProblemType,
      message: r.message,
      sourcePage: r.sourcePage,
      source: r.source,
      locationLabel: r.locationLabel,
      latitude: r.latitude != null ? Number(r.latitude) : null,
      longitude: r.longitude != null ? Number(r.longitude) : null,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  } catch {
    return NextResponse.json({ error: 'Could not load callback requests' }, { status: 500 });
  }

  return NextResponse.json({ items: rows });
}

const patchSchema = z.object({
  callbackRequestId: z.string().uuid(),
  status: z.enum(STATUSES),
});

export async function PATCH(req: Request): Promise<NextResponse> {
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
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  try {
    await db
      .update(schema.callbackRequests)
      .set({ status: parsed.data.status, updatedAt: new Date() })
      .where(eq(schema.callbackRequests.id, parsed.data.callbackRequestId));
  } catch {
    return NextResponse.json({ error: 'Could not update' }, { status: 500 });
  }

  await writeAuditLogSafe({
    actorType: 'admin',
    action: parsed.data.status === 'converted'
      ? 'callback_request.converted'
      : 'callback_request.contacted',
    entityType: 'callback_request',
    entityId: parsed.data.callbackRequestId,
    callbackRequestId: parsed.data.callbackRequestId,
    actorAdminId: admin.adminId,
    actorLabel: admin.email,
    after: { status: parsed.data.status },
  });

  return NextResponse.json({ success: true, status: parsed.data.status });
}
