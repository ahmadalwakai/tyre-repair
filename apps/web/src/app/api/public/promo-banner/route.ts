import { NextResponse } from 'next/server';
import { readPromoBanner } from '@/app/api/admin/settings/promo-banner/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const settings = await readPromoBanner();
  if (!settings.enabled || !settings.message) {
    return NextResponse.json({ banner: null });
  }
  return NextResponse.json({
    banner: {
      message: settings.message,
      variant: settings.variant,
    },
  });
}
