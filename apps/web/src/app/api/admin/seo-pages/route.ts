import { NextResponse } from 'next/server';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import { listSeoPagesForAdmin } from '@/lib/seo/overrides';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<NextResponse> {
  try {
    await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }
  const pages = await listSeoPagesForAdmin();
  return NextResponse.json({ pages });
}
