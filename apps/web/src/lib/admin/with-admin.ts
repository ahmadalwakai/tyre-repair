import { NextResponse } from 'next/server';
import { adminAuthErrorResponse, type AdminAuthContext } from './auth';

export async function withAdmin<T>(
  req: Request,
  handler: (admin: AdminAuthContext) => Promise<T>,
  importer: () => Promise<{ requireAdmin: (r: Request) => Promise<AdminAuthContext> }>,
): Promise<T | NextResponse> {
  try {
    const { requireAdmin } = await importer();
    const admin = await requireAdmin(req);
    return await handler(admin);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
