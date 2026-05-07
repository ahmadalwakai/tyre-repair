import { db, schema } from '@tyrerepair/db';

/* -------------------------------------------------------------------------- */
/* Typed unions                                                               */
/* -------------------------------------------------------------------------- */

export type AuditActorType =
  | 'admin'
  | 'system'
  | 'stripe_webhook'
  | 'customer'
  | 'pusher'
  | 'notification';

export type AuditEntityType =
  | 'admin'
  | 'booking'
  | 'payment'
  | 'booking_adjustment'
  | 'stock'
  | 'callback_request'
  | 'pricing_rule'
  | 'pricing_override'
  | 'notification'
  | 'auth'
  | 'lead'
  | 'cancellation'
  | 'app_settings'
  | 'system';

export type AuditAction =
  // auth
  | 'admin.login.success'
  | 'admin.login.failed'
  | 'admin.logout'
  | 'admin.password_reset.requested'
  | 'admin.password_reset.completed'
  // booking
  | 'booking.created.by_admin'
  | 'booking.created.by_checkout'
  | 'booking.status.changed'
  | 'booking.cancelled'
  | 'booking.completed'
  | 'booking.assessment.outcome_set'
  | 'booking.assessment.converted'
  | 'booking.payment_link.sent'
  | 'booking.location_request.sent'
  | 'booking.tracking_link.sent'
  | 'booking.note.added'
  | 'booking.no_answer.marked'
  | 'booking.dispatch_checklist.completed'
  // payment
  | 'payment.intent.created.checkout'
  | 'payment.intent.created.deposit'
  | 'payment.intent.created.balance'
  | 'payment.intent.created.adjustment'
  | 'payment.succeeded'
  | 'payment.failed'
  | 'payment.cancelled'
  | 'payment.refund.received'
  | 'payment.balance.paid'
  | 'payment.adjustment.paid'
  | 'payment.link.sent'
  // stock
  | 'stock.decremented.by_webhook'
  | 'stock.updated.by_admin'
  | 'stock.csv.imported'
  | 'stock.low_stock.alert_triggered'
  | 'stock.skipped.assessment'
  | 'stock.skipped.deposit_only'
  | 'stock.skipped.special_order'
  | 'stock.skipped.already_processed'
  | 'stock.skipped.row_missing'
  | 'stock.decrement.failed'
  // pricing
  | 'pricing.rule.updated'
  | 'pricing.override.created'
  | 'pricing.override.updated'
  | 'pricing.override.deactivated'
  | 'pricing.override.below_recommended_minimum'
  | 'pricing.safety.public_payment_blocked'
  | 'pricing.settings.updated'
  // callback / lead
  | 'callback_request.created'
  | 'callback_request.contacted'
  | 'callback_request.converted'
  | 'lead.call_button.clicked'
  | 'lead.call_popup.quick_booking_opened'
  | 'lead.call_click.acknowledged'
  | 'emergency_assist.created'
  // notifications
  | 'notification.push.sent'
  | 'notification.push.failed'
  | 'notification.push.token_deactivated'
  // cancellation
  | 'cancellation.created'
  | 'cancellation.deposit.retained'
  | 'cancellation.refund.review_required'
  // operational settings (Item 13)
  | 'settings.operations.updated'
  // notifications inbox (Item 11)
  | 'notification.inbox.marked_read'
  | 'notification.inbox.marked_handled'
  // mapbox / location (Item 18)
  | 'booking.mapbox_location.viewed'
  // Admin Efficiency Pack
  | 'booking.note.created'
  | 'booking.note.updated'
  | 'booking.note.deleted'
  | 'customer.risk_note.created'
  | 'customer.risk_note.updated'
  | 'customer.risk_note.archived'
  | 'settings.promo_banner.updated'
  | 'settings.service_availability.updated'
  | 'stock.fast_fit.updated'
  | 'admin.quick_booking.created';

export interface WriteAuditLogInput {
  actorType: AuditActorType;
  actorAdminId?: string | null;
  actorLabel?: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | null;
  bookingId?: string | null;
  paymentId?: string | null;
  adjustmentId?: string | null;
  stockId?: string | null;
  callbackRequestId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

/* -------------------------------------------------------------------------- */
/* Sensitive key scrubbing                                                    */
/* -------------------------------------------------------------------------- */

const SENSITIVE_KEY_PATTERNS: readonly RegExp[] = [
  /^stripe[_-]?secret/i,
  /^stripe[_-]?signature$/i,
  /^stripe[_-]?webhook[_-]?secret/i,
  /^webhook[_-]?signature$/i,
  /signature$/i,
  /secret$/i,
  /password/i,
  /^password[_-]?hash$/i,
  /^reset[_-]?token$/i,
  /^location[_-]?token$/i,
  /^admin[_-]?jwt$/i,
  /^jwt$/i,
  /^bearer$/i,
  /^authorization$/i,
  /^cookie$/i,
  /^set[_-]?cookie$/i,
  /^card[_-]?number$/i,
  /^pan$/i,
  /^cvv$/i,
  /^cvc$/i,
  /^api[_-]?key$/i,
  /^access[_-]?token$/i,
  /^refresh[_-]?token$/i,
  /^id[_-]?token$/i,
  /^session[_-]?token$/i,
];

const REDACTED = '[REDACTED]';
const MAX_DEPTH = 6;

function shouldRedact(key: string): boolean {
  for (const pattern of SENSITIVE_KEY_PATTERNS) {
    if (pattern.test(key)) return true;
  }
  return false;
}

function scrubValue(value: unknown, depth: number): unknown {
  if (value === null || value === undefined) return value;
  if (depth >= MAX_DEPTH) return '[TRUNCATED]';
  if (Array.isArray(value)) {
    return value.map((v) => scrubValue(v, depth + 1));
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (shouldRedact(k)) {
        out[k] = REDACTED;
        continue;
      }
      out[k] = scrubValue(v, depth + 1);
    }
    return out;
  }
  return value;
}

function scrubObject(
  input: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!input) return null;
  const scrubbed = scrubValue(input, 0);
  if (scrubbed && typeof scrubbed === 'object' && !Array.isArray(scrubbed)) {
    return scrubbed as Record<string, unknown>;
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Writers                                                                    */
/* -------------------------------------------------------------------------- */

export async function writeAuditLog(input: WriteAuditLogInput): Promise<void> {
  const before = scrubObject(input.before ?? null);
  const after = scrubObject(input.after ?? null);
  const metadata = scrubObject(input.metadata ?? null) ?? {};

  await db.insert(schema.auditLogs).values({
    actorType: input.actorType,
    actorAdminId: input.actorAdminId ?? null,
    actorLabel: input.actorLabel ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    bookingId: input.bookingId ?? null,
    paymentId: input.paymentId ?? null,
    adjustmentId: input.adjustmentId ?? null,
    stockId: input.stockId ?? null,
    callbackRequestId: input.callbackRequestId ?? null,
    before: before as unknown,
    after: after as unknown,
    metadata: metadata as unknown,
  });
}

export async function writeAuditLogSafe(input: WriteAuditLogInput): Promise<void> {
  try {
    await writeAuditLog(input);
  } catch (err) {
    // Never break the calling flow.
    // eslint-disable-next-line no-console
    console.error('[audit-log] failed to write audit log', {
      action: input.action,
      entityType: input.entityType,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}
