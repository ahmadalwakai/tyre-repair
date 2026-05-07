import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, eq } from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import { writeAuditLogSafe } from '@/lib/audit/audit-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SETTINGS_KEY = 'promo_banner';

const VARIANTS = ['INFO', 'WARNING', 'EMERGENCY'] as const;

const writeSchema = z.object({
  enabled: z.boolean(),
  message: z.string().trim().min(1).max(240),
  variant: z.enum(VARIANTS).default('INFO'),
});

export interface PromoBannerSettings {
  enabled: boolean;
  message: string;
  variant: (typeof VARIANTS)[number];
  updatedAt: string;
}

const DEFAULTS: PromoBannerSettings = {
  enabled: false,
  message: '',
  variant: 'INFO',
  updatedAt: new Date(0).toISOString(),
};

export async function readPromoBanner(): Promise<PromoBannerSettings> {
  try {
    const rows = await db
      .select({ value: schema.appSettings.value, updatedAt: schema.appSettings.updatedAt })
      .from(schema.appSettings)
      .where(eq(schema.appSettings.key, SETTINGS_KEY))
      .limit(1);
    const r = rows[0];
    if (!r) return DEFAULTS;
    const v = r.value as Partial<PromoBannerSettings> | null;
    return {
      enabled: !!v?.enabled,
      message: typeof v?.message === 'string' ? v.message : '',
      variant:
        v?.variant === 'WARNING' || v?.variant === 'EMERGENCY' ? v.variant : 'INFO',
      updatedAt: r.updatedAt.toISOString(),
    };
  } catch {
    return DEFAULTS;
  }
}

export async function GET(req: Request): Promise<NextResponse> {
  try {
    await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }
  const settings = await readPromoBanner();
  return NextResponse.json({ settings });
}

export async function PATCH(req: Request): Promise<NextResponse> {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = writeSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const value = {
    enabled: parsed.data.enabled,
    message: parsed.data.message,
    variant: parsed.data.variant,
  };

  const existing = await db
    .select({ id: schema.appSettings.id })
    .from(schema.appSettings)
    .where(eq(schema.appSettings.key, SETTINGS_KEY))
    .limit(1);
  if (existing[0]) {
    await db
      .update(schema.appSettings)
      .set({ value: value as unknown as Record<string, unknown>, updatedAt: new Date() })
      .where(eq(schema.appSettings.key, SETTINGS_KEY));
  } else {
    await db.insert(schema.appSettings).values({
      key: SETTINGS_KEY,
      value: value as unknown as Record<string, unknown>,
      description: 'Public homepage promo banner',
    });
  }

  await writeAuditLogSafe({
    actorType: 'admin',
    action: 'settings.promo_banner.updated',
    entityType: 'system',
    actorAdminId: admin.adminId,
    actorLabel: admin.email,
    after: value,
  });

  const settings = await readPromoBanner();
  return NextResponse.json({ settings });
}
