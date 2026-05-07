import { NextResponse } from 'next/server';
import {
  readServiceAvailability,
  SERVICE_AVAILABILITY_PUBLIC_COPY,
} from '@/app/api/admin/settings/service-availability/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const settings = await readServiceAvailability();
  const copy = SERVICE_AVAILABILITY_PUBLIC_COPY[settings.mode];
  return NextResponse.json({
    mode: settings.mode,
    headline: copy.headline,
    detail: copy.detail,
  });
}
