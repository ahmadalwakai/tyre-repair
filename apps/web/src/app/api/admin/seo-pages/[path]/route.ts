import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import { writeAuditLogSafe } from '@/lib/audit/audit-log';
import {
  getSeoPageForAdmin,
  resetSeoPageOverride,
  upsertSeoPageOverride,
} from '@/lib/seo/overrides';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchSchema = z
  .object({
    title: z.string().trim().max(200).nullable().optional(),
    description: z.string().trim().max(320).nullable().optional(),
    h1: z.string().trim().max(200).nullable().optional(),
    intro: z.string().trim().max(2000).nullable().optional(),
    keywords: z.array(z.string().trim().min(1).max(80)).max(40).nullable().optional(),
    noindex: z.boolean().nullable().optional(),
    notes: z.string().max(2000).nullable().optional(),
    /** When true, clear ALL overrides for this path (revert to defaults). */
    reset: z.boolean().optional(),
  })
  .strict();

function normalisePath(raw: string): string {
  const decoded = decodeURIComponent(raw);
  return decoded.startsWith('/') ? decoded : `/${decoded}`;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ path: string }> },
): Promise<NextResponse> {
  try {
    await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }
  const { path } = await params;
  const page = await getSeoPageForAdmin(normalisePath(path));
  if (!page) return NextResponse.json({ error: 'Unknown page path' }, { status: 404 });
  return NextResponse.json({ page });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ path: string }> },
): Promise<NextResponse> {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  const { path: rawPath } = await params;
  const path = normalisePath(rawPath);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const before = await getSeoPageForAdmin(path);
  if (!before) {
    return NextResponse.json({ error: 'Unknown page path' }, { status: 404 });
  }

  let result;
  if (parsed.data.reset) {
    result = await resetSeoPageOverride(path);
  } else {
    const { reset: _ignored, ...patch } = parsed.data;
    result = await upsertSeoPageOverride(path, patch as Parameters<typeof upsertSeoPageOverride>[1]);
  }
  if (!result) {
    return NextResponse.json({ error: 'Unknown page path' }, { status: 404 });
  }

  await writeAuditLogSafe({
    actorType: 'admin',
    action: parsed.data.reset ? 'seo_page.reset' : 'seo_page.updated',
    entityType: 'seo_page',
    actorAdminId: admin.adminId,
    actorLabel: admin.email,
    before: before.override as unknown as Record<string, unknown>,
    after: result.override as unknown as Record<string, unknown>,
    metadata: { path, score: result.health.score, grade: result.health.grade },
  });

  return NextResponse.json({ page: result });
}
