/**
 * POST /api/admin/pricing/override-quote
 *
 * Records an admin's decision to override the pricing-safety guard for a
 * specific quote (e.g. accepting a price below the recommended minimum
 * for a long-distance assessment). This is a write-only audit-log endpoint:
 * it does NOT mutate the quote total. The actual price is whatever the
 * pricing engine produced; the override simply documents that the admin
 * made a deliberate decision and provided a reason.
 *
 * Required for PART 11 of the Pricing Safety task.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import { writeAuditLogSafe } from '@/lib/audit/audit-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const overrideReasonEnum = z.enum([
  'REPEAT_CUSTOMER',
  'MANUAL_APPROVAL',
  'DISTANCE_REVIEWED',
  'CUSTOMER_AGREED_DEPOSIT',
  'OTHER',
]);

const bodySchema = z.object({
  /** Quote being overridden. May be null for ad-hoc Quick Booking before a quote exists. */
  quoteId: z.string().uuid().optional(),
  /** Admin-typed free-form note (when reason === 'OTHER' or to explain). */
  note: z.string().max(2000).optional(),
  reason: overrideReasonEnum,
  /** The numeric total the admin agreed to (informational). */
  acceptedTotalGbp: z.number().positive().max(100000).optional(),
  /** The recommended minimum the safety guard suggested (informational). */
  recommendedMinimumGbp: z.number().positive().max(100000).optional(),
  /** Distance miles, for the audit row. */
  distanceMiles: z.number().min(0).max(2000).optional(),
  /** Risk level at the time of the override. */
  level: z.enum(['NORMAL', 'REVIEW', 'HIGH_RISK', 'BLOCK_PUBLIC_PAYMENT']).optional(),
});

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
    return NextResponse.json(
      { error: 'Invalid override input', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const d = parsed.data;

  if (d.reason === 'OTHER' && (!d.note || d.note.trim().length < 4)) {
    return NextResponse.json(
      { error: 'A note is required when the reason is "Other".' },
      { status: 400 },
    );
  }

  await writeAuditLogSafe({
    actorType: 'admin',
    actorAdminId: admin.adminId,
    action: 'pricing.override.below_recommended_minimum',
    entityType: d.quoteId ? 'booking' : 'pricing_override',
    entityId: d.quoteId ?? 'ad_hoc',
    metadata: {
      reason: d.reason,
      ...(d.note ? { note: d.note } : {}),
      ...(typeof d.acceptedTotalGbp === 'number'
        ? { acceptedTotalGbp: d.acceptedTotalGbp }
        : {}),
      ...(typeof d.recommendedMinimumGbp === 'number'
        ? { recommendedMinimumGbp: d.recommendedMinimumGbp }
        : {}),
      ...(typeof d.distanceMiles === 'number' ? { distanceMiles: d.distanceMiles } : {}),
      ...(d.level ? { level: d.level } : {}),
      source: 'quick_booking_wizard',
    },
  });

  return NextResponse.json({ success: true }, { status: 200 });
}
