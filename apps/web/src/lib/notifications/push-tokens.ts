import { db, schema, eq, and, desc, inArray } from '@tyrerepair/db';
import type { ActiveAdminPushToken, RegisterPushTokenInput } from './types';

export async function upsertAdminPushToken(
  input: RegisterPushTokenInput,
): Promise<{ tokenId: string }> {
  const now = new Date();
  const existingRows = await db
    .select({ id: schema.pushTokens.id })
    .from(schema.pushTokens)
    .where(eq(schema.pushTokens.expoPushToken, input.expoPushToken))
    .limit(1);
  const existing = existingRows[0];
  if (existing) {
    await db
      .update(schema.pushTokens)
      .set({
        adminId: input.adminId,
        platform: input.platform,
        deviceName: input.deviceName ?? null,
        isActive: true,
        lastSeenAt: now,
        updatedAt: now,
      })
      .where(eq(schema.pushTokens.id, existing.id));
    return { tokenId: existing.id };
  }
  const inserted = await db
    .insert(schema.pushTokens)
    .values({
      adminId: input.adminId,
      expoPushToken: input.expoPushToken,
      platform: input.platform,
      deviceName: input.deviceName ?? null,
      isActive: true,
      lastSeenAt: now,
    })
    .returning({ id: schema.pushTokens.id });
  const created = inserted[0];
  if (!created) throw new Error('Could not create push token');
  return { tokenId: created.id };
}

export async function deactivateAdminPushToken(input: {
  adminId: string;
  expoPushToken: string;
}): Promise<void> {
  await db
    .update(schema.pushTokens)
    .set({ isActive: false, updatedAt: new Date() })
    .where(
      and(
        eq(schema.pushTokens.adminId, input.adminId),
        eq(schema.pushTokens.expoPushToken, input.expoPushToken),
      ),
    );
}

export async function deactivateInvalidExpoPushTokens(tokens: string[]): Promise<void> {
  if (tokens.length === 0) return;
  await db
    .update(schema.pushTokens)
    .set({ isActive: false, updatedAt: new Date() })
    .where(inArray(schema.pushTokens.expoPushToken, tokens));
}

export async function getActiveAdminPushTokens(opts?: {
  adminId?: string;
}): Promise<ActiveAdminPushToken[]> {
  const filters = [eq(schema.pushTokens.isActive, true)];
  if (opts?.adminId) filters.push(eq(schema.pushTokens.adminId, opts.adminId));
  const rows = await db
    .select({
      id: schema.pushTokens.id,
      adminId: schema.pushTokens.adminId,
      expoPushToken: schema.pushTokens.expoPushToken,
    })
    .from(schema.pushTokens)
    .where(and(...filters))
    .orderBy(desc(schema.pushTokens.lastSeenAt));
  return rows;
}
