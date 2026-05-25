/**
 * Admin Stability & Field Operations Pack — Part 3
 * GET  /api/admin/bookings/[bookingId]/attachments  — list attachments
 * POST /api/admin/bookings/[bookingId]/attachments  — record an uploaded attachment
 *
 * The web layer does NOT perform binary uploads here; it persists metadata
 * for an object already uploaded by the admin app/client to the configured
 * storage provider. If no storage provider is configured, POST returns 503
 * with a clear, customer-safe message.
 *
 * Customer-facing surfaces never expose attachments.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, eq, desc } from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import {
  hasPermission,
  permissionErrorResponse,
  requirePermission,
} from '@/lib/admin/permissions';
import { getStorageConfigStatus } from '@/lib/admin/storage-config';
import { writeAuditLogSafe } from '@/lib/audit/audit-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ATTACHMENT_TYPES = [
  'DAMAGE_PHOTO',
  'TYRE_SIZE_PHOTO',
  'LOCKING_NUT_PHOTO',
  'AFTER_REPAIR_PHOTO',
  'RECEIPT_PHOTO',
  'OTHER',
] as const;

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

const createSchema = z.object({
  type: z.enum(ATTACHMENT_TYPES),
  fileUrl: z.string().url().max(2048),
  fileKey: z.string().max(512).optional(),
  mimeType: z
    .string()
    .max(120)
    .regex(/^[a-z]+\/[a-zA-Z0-9.+-]+$/, { message: 'Invalid mime type' }),
  sizeBytes: z.number().int().min(0).max(MAX_BYTES),
  caption: z.string().max(280).optional(),
});

interface RouteContext {
  params: Promise<{ bookingId: string }>;
}

export async function GET(req: Request, context: RouteContext): Promise<NextResponse> {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  const { bookingId } = await context.params;
  if (!bookingId || typeof bookingId !== 'string') {
    return NextResponse.json({ error: 'Invalid bookingId' }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(schema.bookingAttachments)
    .where(eq(schema.bookingAttachments.bookingId, bookingId))
    .orderBy(desc(schema.bookingAttachments.createdAt));

  return NextResponse.json({
    bookingId,
    canUpload: hasPermission(admin, 'booking.attachments.upload'),
    canDelete: hasPermission(admin, 'booking.attachments.delete'),
    storage: getStorageConfigStatus(),
    items: rows,
  });
}

export async function POST(req: Request, context: RouteContext): Promise<NextResponse> {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  try {
    requirePermission(admin, 'booking.attachments.upload');
  } catch (err) {
    const res = permissionErrorResponse(err);
    if (res) return res;
    throw err;
  }

  const storage = getStorageConfigStatus();
  if (!storage.configured) {
    return NextResponse.json(
      {
        error: 'Photo upload is not configured.',
        code: 'storage_not_configured',
        missing: storage.missing,
      },
      { status: 503 },
    );
  }

  const { bookingId } = await context.params;
  if (!bookingId || typeof bookingId !== 'string') {
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
    return NextResponse.json(
      { error: 'Invalid attachment payload', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const bookingExists = await db
    .select({ id: schema.bookings.id })
    .from(schema.bookings)
    .where(eq(schema.bookings.id, bookingId))
    .limit(1);
  if (bookingExists.length === 0) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  const [inserted] = await db
    .insert(schema.bookingAttachments)
    .values({
      bookingId,
      uploadedByAdminId: admin.adminId,
      type: parsed.data.type,
      fileUrl: parsed.data.fileUrl,
      fileKey: parsed.data.fileKey ?? null,
      mimeType: parsed.data.mimeType,
      sizeBytes: parsed.data.sizeBytes,
      caption: parsed.data.caption ?? null,
    })
    .returning();

  if (!inserted) {
    return NextResponse.json({ error: 'Failed to record attachment' }, { status: 500 });
  }

  await writeAuditLogSafe({
    actorType: 'admin',
    actorAdminId: admin.adminId,
    actorLabel: admin.email,
    action: 'booking.attachment.uploaded',
    entityType: 'booking',
    entityId: bookingId,
    bookingId,
    after: {
      attachmentId: inserted.id,
      type: inserted.type,
      mimeType: inserted.mimeType,
      sizeBytes: inserted.sizeBytes,
    },
  });

  return NextResponse.json({ item: inserted }, { status: 201 });
}
