import { NextResponse } from 'next/server';
import { syncTyreCatalogue, syncPricingRules } from '@/lib/tyrerescue/sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: Request): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('Authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [catalogue, pricing] = await Promise.allSettled([
    syncTyreCatalogue(),
    syncPricingRules(),
  ]);

  return NextResponse.json({
    data: {
      catalogue: catalogue.status === 'fulfilled' ? catalogue.value : { error: String((catalogue as PromiseRejectedResult).reason) },
      pricing: pricing.status === 'fulfilled' ? pricing.value : { error: String((pricing as PromiseRejectedResult).reason) },
    },
  });
}
