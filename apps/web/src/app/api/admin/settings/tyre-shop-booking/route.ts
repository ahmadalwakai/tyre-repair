import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, sql } from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import { writeAuditLogSafe } from '@/lib/audit/audit-log';
import { getTyreShopFees } from '@/lib/tyre-shop/settings';
import { getPricingExtras } from '@/lib/pricing/settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Admin endpoint exposing booking-window + pricing-extras toggles that were
 * previously hard-coded in `lib/tyre-shop/slots.ts`, `lib/pricing/engine.ts`
 * and `lib/bookings/create-booking.ts`.
 *
 * Stored as discrete `app_settings` rows so each value can be migrated /
 * rotated independently:
 *   - tyre_shop.slot_times              : string[] (HH:MM)
 *   - tyre_shop.booking_window_days     : number  (1..60)
 *   - tyre_shop.sundays_open            : boolean
 *   - pricing.quote_expiry_minutes      : number  (1..1440)
 *   - pricing.minimum_deposit_gbp       : number  (0..1000)
 */

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const updateSchema = z
  .object({
    slotTimes: z.array(z.string().regex(HHMM)).min(1).max(24).optional(),
    bookingWindowDays: z.number().int().min(1).max(60).optional(),
    sundaysOpen: z.boolean().optional(),
    quoteExpiryMinutes: z.number().int().min(1).max(24 * 60).optional(),
    minimumDepositGbp: z.number().min(0).max(1000).optional(),
    peakMorningStartHour: z.number().int().min(0).max(23).optional(),
    peakMorningEndHour: z.number().int().min(0).max(23).optional(),
    nightStartHour: z.number().int().min(0).max(23).optional(),
    nightEndHour: z.number().int().min(0).max(23).optional(),
  })
  .strict();

interface BookingExtrasView {
  slotTimes: string[];
  bookingWindowDays: number;
  sundaysOpen: boolean;
  quoteExpiryMinutes: number;
  minimumDepositGbp: number;
  peakMorningStartHour: number;
  peakMorningEndHour: number;
  nightStartHour: number;
  nightEndHour: number;
}

async function loadView(): Promise<BookingExtrasView> {
  const [fees, extras] = await Promise.all([getTyreShopFees(), getPricingExtras()]);
  return {
    slotTimes: fees.slotTimes,
    bookingWindowDays: fees.bookingWindowDays,
    sundaysOpen: fees.sundaysOpen,
    quoteExpiryMinutes: extras.quoteExpiryMinutes,
    minimumDepositGbp: extras.minimumDepositGbp,
    peakMorningStartHour: extras.peakMorningStartHour,
    peakMorningEndHour: extras.peakMorningEndHour,
    nightStartHour: extras.nightStartHour,
    nightEndHour: extras.nightEndHour,
  };
}

export async function GET(req: Request): Promise<NextResponse> {
  try {
    await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }
  return NextResponse.json({ settings: await loadView() });
}

const KEY_MAP: Record<keyof BookingExtrasView, string> = {
  slotTimes: 'tyre_shop.slot_times',
  bookingWindowDays: 'tyre_shop.booking_window_days',
  sundaysOpen: 'tyre_shop.sundays_open',
  quoteExpiryMinutes: 'pricing.quote_expiry_minutes',
  minimumDepositGbp: 'pricing.minimum_deposit_gbp',
  peakMorningStartHour: 'pricing.peak_morning_start_hour',
  peakMorningEndHour: 'pricing.peak_morning_end_hour',
  nightStartHour: 'pricing.night_start_hour',
  nightEndHour: 'pricing.night_end_hour',
};

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

  const before = await loadView();

  for (const [k, v] of Object.entries(parsed.data) as [
    keyof BookingExtrasView,
    unknown,
  ][]) {
    if (v === undefined) continue;
    const key = KEY_MAP[k];
    await db
      .insert(schema.appSettings)
      .values({
        key,
        value: { value: v } as unknown as Record<string, unknown>,
        description: `Booking/pricing extra: ${k}`,
      })
      .onConflictDoUpdate({
        target: schema.appSettings.key,
        set: {
          value: { value: v } as unknown as Record<string, unknown>,
          updatedAt: sql`now()`,
        },
      });
  }

  const after = await loadView();

  await writeAuditLogSafe({
    actorType: 'admin',
    action: 'settings.tyre_shop_booking.updated',
    entityType: 'system',
    actorAdminId: admin.adminId,
    actorLabel: admin.email,
    before: before as unknown as Record<string, unknown>,
    after: after as unknown as Record<string, unknown>,
  });

  return NextResponse.json({ settings: after });
}
