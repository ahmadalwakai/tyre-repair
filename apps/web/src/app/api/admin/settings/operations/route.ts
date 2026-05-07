import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, eq, sql } from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import { writeAuditLogSafe } from '@/lib/audit/audit-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* -------------------------------------------------------------------------- */
/* Item 13 — Operational Settings                                             */
/* -------------------------------------------------------------------------- */

const SETTING_KEY = 'operations';

interface OperationalSettings {
  emergencyAssessmentFeeGbp: string;
  depositPercentage: number;
  servicePhoneNumber: string;
  whatsappNumber: string;
  lowStockThreshold: number;
  specialOrderMessage: string;
  cancellationPolicyUrl: string;
}

const DEFAULTS: OperationalSettings = {
  emergencyAssessmentFeeGbp: '20.00',
  depositPercentage: 15,
  servicePhoneNumber: process.env.NEXT_PUBLIC_BUSINESS_PHONE_DISPLAY ?? '',
  whatsappNumber: process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP ?? '',
  lowStockThreshold: 2,
  specialOrderMessage: 'Special order — fitted within 3 working days',
  cancellationPolicyUrl: '/cancellation-policy',
};

const updateSchema = z
  .object({
    emergencyAssessmentFeeGbp: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, 'Must be a positive amount')
      .optional(),
    depositPercentage: z.number().int().min(1).max(50).optional(),
    servicePhoneNumber: z.string().min(0).max(64).optional(),
    whatsappNumber: z.string().min(0).max(64).optional(),
    lowStockThreshold: z.number().int().min(0).max(999).optional(),
    specialOrderMessage: z.string().min(1).max(280).optional(),
    cancellationPolicyUrl: z.string().min(1).max(280).optional(),
  })
  .strict();

async function loadSettings(): Promise<OperationalSettings> {
  const rows = await db
    .select({ value: schema.appSettings.value })
    .from(schema.appSettings)
    .where(eq(schema.appSettings.key, SETTING_KEY))
    .limit(1);
  const stored = (rows[0]?.value as Partial<OperationalSettings> | undefined) ?? {};
  return { ...DEFAULTS, ...stored };
}

export async function GET(req: Request): Promise<NextResponse> {
  try {
    await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }
  const settings = await loadSettings();
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
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const before = await loadSettings();
  const patch: Partial<OperationalSettings> = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) (patch as Record<string, unknown>)[k] = v;
  }
  const next: OperationalSettings = { ...before, ...patch };

  await db
    .insert(schema.appSettings)
    .values({
      key: SETTING_KEY,
      value: next as unknown as Record<string, unknown>,
      description: 'Operational settings managed via admin Operational Settings screen.',
    })
    .onConflictDoUpdate({
      target: schema.appSettings.key,
      set: {
        value: next as unknown as Record<string, unknown>,
        updatedAt: sql`now()`,
      },
    });

  await writeAuditLogSafe({
    actorType: 'admin',
    action: 'settings.operations.updated',
    entityType: 'system',
    actorAdminId: admin.adminId,
    actorLabel: admin.email,
    before: before as unknown as Record<string, unknown>,
    after: next as unknown as Record<string, unknown>,
  });

  return NextResponse.json({ settings: next });
}
