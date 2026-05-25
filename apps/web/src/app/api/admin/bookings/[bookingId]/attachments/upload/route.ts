/**
 * Admin Stability & Field Operations Pack — Part 3 (binary upload)
 * POST /api/admin/bookings/[bookingId]/attachments/upload
 *
 * Multipart binary upload for booking photos. Only `vercel_blob` is
 * implemented in-process; other providers (s3/r2) still use the metadata
 * POST path. If storage is not configured, returns 503 with the same
 * customer-safe `storage_not_configured` shape used elsewhere.
 *
 * Auth + permission: admin JWT + `booking.attachments.upload`.
 * Size cap: 5MB. MIME must start with `image/`.
 *
 * Customer-facing surfaces never expose this route.
 */
import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { db, schema, eq } from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import {
  permissionErrorResponse,
  requirePermission,
} from '@/lib/admin/permissions';
import { getStorageConfigStatus } from '@/lib/admin/storage-config';
import { writeAuditLogSafe } from '@/lib/audit/audit-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ATTACHMENT_TYPES = new Set([
  'DAMAGE_PHOTO',
  'TYRE_SIZE_PHOTO',
  'LOCKING_NUT_PHOTO',
  'AFTER_REPAIR_PHOTO',
  'RECEIPT_PHOTO',
  'OTHER',
]);
type AttachmentType =
  | 'DAMAGE_PHOTO'
  | 'TYRE_SIZE_PHOTO'
  | 'LOCKING_NUT_PHOTO'
  | 'AFTER_REPAIR_PHOTO'
  | 'RECEIPT_PHOTO'
  | 'OTHER';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = /^image\/(jpeg|png|webp|heic|heif)$/i;

interface RouteContext {
  params: Promise<{ bookingId: string }>;
}

function safeExt(mime: string): string {
  const m = mime.toLowerCase();
  if (m === 'image/jpeg') return 'jpg';
  if (m === 'image/png') return 'png';
  if (m === 'image/webp') return 'webp';
  if (m === 'image/heic') return 'heic';
  if (m === 'image/heif') return 'heif';
  return 'bin';
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
  if (storage.provider !== 'vercel_blob') {
    return NextResponse.json(
      {
        error:
          'Binary upload via this endpoint is only supported for the vercel_blob provider. Use the metadata POST after uploading to your S3/R2 bucket.',
        code: 'provider_not_supported',
        provider: storage.provider,
      },
      { status: 501 },
    );
  }

  const { bookingId } = await context.params;
  if (!bookingId || typeof bookingId !== 'string') {
    return NextResponse.json({ error: 'Invalid bookingId' }, { status: 400 });
  }

  const bookingExists = await db
    .select({ id: schema.bookings.id })
    .from(schema.bookings)
    .where(eq(schema.bookings.id, bookingId))
    .limit(1);
  if (bookingExists.length === 0) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid multipart body' }, { status: 400 });
  }

  const file = form.get('file');
  const rawType = String(form.get('type') ?? 'OTHER').toUpperCase();
  const captionRaw = form.get('caption');
  const caption =
    typeof captionRaw === 'string' && captionRaw.trim().length > 0
      ? captionRaw.trim().slice(0, 280)
      : null;

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'Missing `file` field' }, { status: 400 });
  }
  if (!ATTACHMENT_TYPES.has(rawType)) {
    return NextResponse.json({ error: 'Invalid `type`' }, { status: 400 });
  }
  const type = rawType as AttachmentType;

  const mimeType = (file.type || '').toLowerCase();
  if (!ALLOWED_MIME.test(mimeType)) {
    return NextResponse.json(
      { error: 'Only JPEG, PNG, WEBP, HEIC or HEIF images are allowed.' },
      { status: 415 },
    );
  }
  const sizeBytes = file.size;
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return NextResponse.json({ error: 'Empty file' }, { status: 400 });
  }
  if (sizeBytes > MAX_BYTES) {
    return NextResponse.json(
      { error: `File exceeds ${MAX_BYTES} bytes.` },
      { status: 413 },
    );
  }

  const ext = safeExt(mimeType);
  const objectKey = `bookings/${bookingId}/${type.toLowerCase()}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${ext}`;

  let uploadedUrl: string;
  let uploadedKey: string;
  try {
    const token = process.env['BLOB_READ_WRITE_TOKEN'];
    const blob = await put(objectKey, file, {
      access: 'public',
      contentType: mimeType,
      addRandomSuffix: false,
      ...(token ? { token } : {}),
    });
    uploadedUrl = blob.url;
    uploadedKey = blob.pathname;
  } catch (err) {
    return NextResponse.json(
      {
        error: 'Upload failed',
        detail: err instanceof Error ? err.message : 'unknown',
      },
      { status: 502 },
    );
  }

  const [inserted] = await db
    .insert(schema.bookingAttachments)
    .values({
      bookingId,
      uploadedByAdminId: admin.adminId,
      type,
      fileUrl: uploadedUrl,
      fileKey: uploadedKey,
      mimeType,
      sizeBytes,
      caption,
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
      provider: 'vercel_blob',
    },
  });

  return NextResponse.json({ item: inserted }, { status: 201 });
}
