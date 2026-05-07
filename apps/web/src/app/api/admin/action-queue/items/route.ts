/**
 * GET /api/admin/action-queue/items
 *
 * Persistent action queue items (Cmd 2). Distinct from the existing
 * /api/admin/action-queue endpoint which dynamically aggregates many
 * sources — this endpoint reads the action_queue_items table.
 *
 * Query params:
 *   - type:   ActionQueueItemType (default: PRICING_REVIEW_REQUIRED)
 *   - status: ActionQueueItemStatus (default: OPEN)
 *
 * Returns the latest 50 rows ordered by updatedAt DESC.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, and, desc, eq } from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import type {
  ActionQueueItemDto,
  ActionQueueItemStatus,
  ActionQueueItemType,
  ActionQueueListResponse,
  ActionQueueSuggestedPayment,
} from '@/lib/action-queue/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const querySchema = z.object({
  type: z
    .enum(['WEBSITE_CALL_CLICKED', 'EMERGENCY_ASSIST', 'PRICING_REVIEW_REQUIRED'])
    .default('PRICING_REVIEW_REQUIRED'),
  status: z.enum(['OPEN', 'REVIEWED', 'DISMISSED']).default('OPEN'),
});

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string');
}

function toSuggestedPayment(v: string | null): ActionQueueSuggestedPayment | null {
  if (v === 'CASH' || v === 'DEPOSIT_15' || v === 'FULL' || v === 'MANUAL_REVIEW') return v;
  return null;
}

function toType(v: string): ActionQueueItemType {
  if (v === 'WEBSITE_CALL_CLICKED' || v === 'EMERGENCY_ASSIST' || v === 'PRICING_REVIEW_REQUIRED') {
    return v;
  }
  // Fallback for any rows written by future code paths — we still surface them.
  return 'PRICING_REVIEW_REQUIRED';
}

function toStatus(v: string): ActionQueueItemStatus {
  if (v === 'OPEN' || v === 'REVIEWED' || v === 'DISMISSED') return v;
  return 'OPEN';
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
    type: url.searchParams.get('type') ?? undefined,
    status: url.searchParams.get('status') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const rows = await db
    .select()
    .from(schema.actionQueueItems)
    .where(
      and(
        eq(schema.actionQueueItems.type, parsed.data.type),
        eq(schema.actionQueueItems.status, parsed.data.status),
      ),
    )
    .orderBy(desc(schema.actionQueueItems.updatedAt))
    .limit(50);

  const items: ActionQueueItemDto[] = rows.map((r) => ({
    id: r.id,
    type: toType(r.type),
    bookingId: r.bookingId ?? null,
    referenceId: r.referenceId ?? null,
    title: r.title,
    reasons: toStringArray(r.reasons),
    suggestedPayment: toSuggestedPayment(r.suggestedPayment ?? null),
    recommendedNextSteps: toStringArray(r.recommendedNextSteps),
    status: toStatus(r.status),
    reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
    reviewedBy: r.reviewedBy ?? null,
    reviewNote: r.reviewNote ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  const body: ActionQueueListResponse = { items };
  return NextResponse.json(body);
}
