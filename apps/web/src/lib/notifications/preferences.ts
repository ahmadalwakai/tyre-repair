import { db, schema, eq } from '@tyrerepair/db';
import type {
  AdminNotificationPreferences,
  UpdateAdminNotificationPreferencesInput,
} from './types';

const DEFAULTS: AdminNotificationPreferences = {
  pushEnabled: true,
  soundEnabled: true,
  bookingAlertsEnabled: true,
  stockAlertsEnabled: true,
  pricingAlertsEnabled: true,
  visitorAlertsEnabled: false,
};

async function readRow(adminId: string): Promise<AdminNotificationPreferences | null> {
  const rows = await db
    .select({
      pushEnabled: schema.notificationPreferences.pushEnabled,
      soundEnabled: schema.notificationPreferences.soundEnabled,
      bookingAlertsEnabled: schema.notificationPreferences.bookingAlertsEnabled,
      stockAlertsEnabled: schema.notificationPreferences.stockAlertsEnabled,
      pricingAlertsEnabled: schema.notificationPreferences.pricingAlertsEnabled,
      visitorAlertsEnabled: schema.notificationPreferences.visitorAlertsEnabled,
    })
    .from(schema.notificationPreferences)
    .where(eq(schema.notificationPreferences.adminId, adminId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getAdminNotificationPreferences(
  adminId: string,
): Promise<AdminNotificationPreferences> {
  const existing = await readRow(adminId);
  if (existing) return existing;
  try {
    await db.insert(schema.notificationPreferences).values({ adminId });
  } catch {
    // unique-constraint race; tolerate
  }
  const created = await readRow(adminId);
  return created ?? { ...DEFAULTS };
}

export async function upsertAdminNotificationPreferences(
  adminId: string,
  input: UpdateAdminNotificationPreferencesInput,
): Promise<AdminNotificationPreferences> {
  await getAdminNotificationPreferences(adminId);
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of [
    'pushEnabled',
    'soundEnabled',
    'bookingAlertsEnabled',
    'stockAlertsEnabled',
    'pricingAlertsEnabled',
    'visitorAlertsEnabled',
  ] as const) {
    const v = input[key];
    if (typeof v === 'boolean') updates[key] = v;
  }
  await db
    .update(schema.notificationPreferences)
    .set(updates)
    .where(eq(schema.notificationPreferences.adminId, adminId));
  const after = await readRow(adminId);
  return after ?? { ...DEFAULTS };
}
