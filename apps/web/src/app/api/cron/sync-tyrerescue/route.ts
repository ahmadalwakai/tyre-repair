import { NextResponse } from 'next/server';
import { syncStock } from '@/lib/tyrerescue/sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get('Authorization');
  return auth === `Bearer ${secret}`;
}

async function run(req: Request): Promise<NextResponse> {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (process.env.TYRERESCUE_SYNC_ENABLED === 'false') {
    return NextResponse.json({
      data: { skipped: true, reason: 'TYRERESCUE_SYNC_ENABLED=false' },
    });
  }

  try {
    const result = await syncStock();
    return NextResponse.json({ data: { stock: result } });
  } catch (err) {
    return NextResponse.json(
      { error: 'Tyre Rescue stock sync failed', detail: String(err) },
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
