import 'server-only';
import { db, schema, eq, and, gte, desc } from '@tyrerepair/db';
import type { AuditAction } from '@/lib/audit/audit-log';

/**
 * Item 14 — duplicate-action protection.
 *
 * Returns `{ alreadySentRecently, lastSentAt }` for a given audit action
 * scoped to a booking. Uses `audit_logs` so we never need a new table.
 */
export interface RecentlySentResult {
  alreadySentRecently: boolean;
  lastSentAt: string | null;
  message?: string;
}

export async function wasRecentlySent(input: {
  bookingId: string;
  action: AuditAction;
  withinSeconds: number;
}): Promise<RecentlySentResult> {
  const cutoff = new Date(Date.now() - input.withinSeconds * 1000);
  try {
    const rows = await db
      .select({ createdAt: schema.auditLogs.createdAt })
      .from(schema.auditLogs)
      .where(
        and(
          eq(schema.auditLogs.bookingId, input.bookingId),
          eq(schema.auditLogs.action, input.action),
          gte(schema.auditLogs.createdAt, cutoff),
        ),
      )
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(1);
    const last = rows[0];
    if (!last) return { alreadySentRecently: false, lastSentAt: null };
    return {
      alreadySentRecently: true,
      lastSentAt: last.createdAt.toISOString(),
      message: 'A similar action was performed recently for this booking.',
    };
  } catch {
    return { alreadySentRecently: false, lastSentAt: null };
  }
}
