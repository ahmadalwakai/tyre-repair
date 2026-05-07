import { NextResponse } from 'next/server';
import {
  ADMIN_CHANNEL,
  PRICING_CHANNEL,
  triggerRealtimeEvent,
  type PricingRulesUpdatedPayload,
} from '@tyrerepair/realtime';
import { clearPricingRulesCache } from '@/lib/pricing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function checkAdminAuth(req: Request): NextResponse | null {
  const provided = req.headers.get('x-admin-dev-secret');
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret || !provided || provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export async function POST(req: Request): Promise<NextResponse> {
  const authError = checkAdminAuth(req);
  if (authError) return authError;

  clearPricingRulesCache();

  const updatedAt = new Date();
  const payload: PricingRulesUpdatedPayload = {
    changedKeys: ['all'],
    updatedByAdminId: null,
    updatedAt: updatedAt.toISOString(),
  };
  const event = {
    type: 'pricing.rules.updated' as const,
    payload,
    createdAt: updatedAt.toISOString(),
  };
  try {
    await Promise.all([
      triggerRealtimeEvent(PRICING_CHANNEL, event),
      triggerRealtimeEvent(ADMIN_CHANNEL, event),
    ]);
  } catch {
    // Pusher unconfigured in dev
  }

  return NextResponse.json({ success: true });
}
