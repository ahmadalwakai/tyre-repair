import { NextResponse } from 'next/server';
import { db, sql } from '@tyrerepair/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CheckStatus = 'ok' | 'degraded';

interface HealthResponse {
  status: CheckStatus;
  service: string;
  timestamp: string;
  database: { status: CheckStatus; message?: string };
  realtime: { status: CheckStatus; message?: string };
  version: string;
}

const SERVICE_NAME = 'tyrerepair-web';
const SERVICE_VERSION = process.env.npm_package_version ?? '0.0.1';

async function checkDatabase(): Promise<{ status: CheckStatus; message?: string }> {
  try {
    await db.execute(sql`select 1`);
    return { status: 'ok' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown database error';
    return { status: 'degraded', message };
  }
}

function checkRealtimeEnv(): { status: CheckStatus; message?: string } {
  const missing: string[] = [];
  if (!process.env.PUSHER_APP_ID) missing.push('PUSHER_APP_ID');
  if (!process.env.PUSHER_KEY) missing.push('PUSHER_KEY');
  if (!process.env.PUSHER_SECRET) missing.push('PUSHER_SECRET');
  if (!process.env.NEXT_PUBLIC_PUSHER_KEY) missing.push('NEXT_PUBLIC_PUSHER_KEY');
  if (missing.length > 0) {
    return { status: 'degraded', message: `Missing env: ${missing.join(', ')}` };
  }
  return { status: 'ok' };
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const [database, realtime] = await Promise.all([
    checkDatabase(),
    Promise.resolve(checkRealtimeEnv()),
  ]);

  const overall: CheckStatus =
    database.status === 'ok' && realtime.status === 'ok' ? 'ok' : 'degraded';

  const body: HealthResponse = {
    status: overall,
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
    database,
    realtime,
    version: SERVICE_VERSION,
  };
  return NextResponse.json(body, { status: overall === 'ok' ? 200 : 503 });
}
