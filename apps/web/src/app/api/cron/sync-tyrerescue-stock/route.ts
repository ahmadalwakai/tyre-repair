import { NextResponse } from 'next/server';
import {
  reconcileAllTyrerescueStock,
} from '@/lib/integrations/tyrerescue-stock-sync';
import {
  isTyrerescueIntegrationConfigured,
  TyrerescueIntegrationError,
} from '@/lib/integrations/tyrerescue';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* -------------------------------------------------------------------------- */
/* Cron: mirror Tyre Rescue stock into the local catalogue                    */
/*                                                                            */
/* Tyre Rescue is the single source of truth for stock. This job pulls the    */
/* full live inventory and reconciles it into tyrerepair's tyre_catalog +     */
/* stock tables: new tyres are added, quantities/prices updated, and tyres    */
/* removed upstream are marked unavailable. A webhook handles instant pushes;  */
/* this cron is the periodic safety net that also catches additions/removals. */
/*                                                                            */
/* Auth: header `x-cron-secret: ${CRON_SECRET}` OR Vercel Cron's              */
/* `Authorization: Bearer ${CRON_SECRET}`.                                    */
/* -------------------------------------------------------------------------- */

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const headerSecret = req.headers.get('x-cron-secret');
  if (headerSecret && headerSecret === secret) return true;
  const auth = req.headers.get('authorization');
  if (auth && auth === `Bearer ${secret}`) return true;
  return false;
}

async function run(req: Request): Promise<NextResponse> {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!isTyrerescueIntegrationConfigured()) {
    return NextResponse.json(
      { error: 'Tyre Rescue integration is not configured' },
      { status: 503 },
    );
  }

  try {
    const result = await reconcileAllTyrerescueStock();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof TyrerescueIntegrationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: 'Tyre Rescue stock sync failed' },
      { status: 500 },
    );
  }
}

export async function GET(req: Request): Promise<NextResponse> {
  return run(req);
}

export async function POST(req: Request): Promise<NextResponse> {
  return run(req);
}
