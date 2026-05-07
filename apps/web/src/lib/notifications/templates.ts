import type {
  BookingAdjustmentCreatedPayload,
  BookingAdjustmentPaidPayload,
  BookingCheckoutStartedPayload,
  BookingCreatedPayload,
  BookingStatusUpdatedPayload,
  CallbackRequestedPayload,
  EmergencyAssistCreatedPayload,
  LeadCallClickedPayload,
  PaymentBalanceSucceededPayload,
  PaymentDepositSucceededPayload,
  PaymentFailedPayload,
  PaymentRefundedPayload,
  PaymentSucceededPayload,
  PricingOverrideUpdatedPayload,
  PricingRulesUpdatedPayload,
  RealtimeEvent,
  StockLowPayload,
  StockUpdatedPayload,
  VisitorUpdatedPayload,
} from '@tyrerepair/realtime';
import {
  STATUS_LABELS,
  type AdminPushDataPayload,
  type AdminPushNotificationCategory,
  type AdminPushNotificationTemplate,
  type NotificationScreenTarget,
} from './types';

export interface BuildAdminNotificationInput {
  event: RealtimeEvent;
}

const SCREEN_BY_CATEGORY: Record<AdminPushNotificationCategory, NotificationScreenTarget> = {
  'booking.created': 'bookings',
  'booking.status.updated': 'bookings',
  'payment.succeeded': 'bookings',
  'payment.failed': 'bookings',
  'payment.refunded': 'bookings',
  'stock.low': 'stock',
  'stock.updated': 'stock',
  'pricing.rules.updated': 'pricing',
  'pricing.override.updated': 'pricing',
  'visitor.updated': 'visitors',
  'callback.requested': 'callbacks',
  'booking.adjustment.created': 'bookings',
  'booking.adjustment.paid': 'bookings',
  'lead.call.clicked': 'quickBooking',
  'payment.deposit.succeeded': 'bookings',
  'payment.balance.succeeded': 'bookings',
  'emergency_assist.created': 'callbacks',
  'booking.checkout.started': 'bookings',
};

function makeData(
  category: AdminPushNotificationCategory,
  createdAt: string,
  extras: Partial<AdminPushDataPayload>,
): AdminPushDataPayload {
  const base: AdminPushDataPayload = {
    eventType: category,
    screenTarget: SCREEN_BY_CATEGORY[category],
    createdAt,
  };
  if (extras.bookingId) base.bookingId = extras.bookingId;
  if (extras.trackingId) base.trackingId = extras.trackingId;
  if (extras.stockId) base.stockId = extras.stockId;
  if (extras.tyreId) base.tyreId = extras.tyreId;
  if (extras.overrideId) base.overrideId = extras.overrideId;
  if (extras.callbackRequestId) base.callbackRequestId = extras.callbackRequestId;
  if (extras.adjustmentId) base.adjustmentId = extras.adjustmentId;
  if (extras.callClickEventId) base.callClickEventId = extras.callClickEventId;
  if (extras.emergencyAssistEventId) base.emergencyAssistEventId = extras.emergencyAssistEventId;
  if (extras.phone) base.phone = extras.phone;
  if (extras.customerName) base.customerName = extras.customerName;
  if (extras.tyreProblemType) base.tyreProblemType = extras.tyreProblemType;
  if (extras.jobType) base.jobType = extras.jobType;
  if (extras.sourcePage) base.sourcePage = extras.sourcePage;
  if (extras.vehicleRegistration) base.vehicleRegistration = extras.vehicleRegistration;
  if (extras.locationLabel) base.locationLabel = extras.locationLabel;
  return base;
}

function template(
  category: AdminPushNotificationCategory,
  title: string,
  body: string,
  data: AdminPushDataPayload,
): AdminPushNotificationTemplate {
  return {
    category,
    title,
    body,
    screenTarget: SCREEN_BY_CATEGORY[category],
    data,
    priority: 'high',
  };
}

export function buildAdminNotificationForEvent(
  input: BuildAdminNotificationInput,
): AdminPushNotificationTemplate | null {
  const { event } = input;
  switch (event.type) {
    case 'booking.created': {
      const p = event.payload as BookingCreatedPayload;
      const isAssessment = p.jobType === 'ASSESSMENT';
      let baseBody = isAssessment
        ? `Emergency assessment booking ${p.trackingId} is confirmed.`
        : `Booking ${p.trackingId} is confirmed and ready to manage.`;
      if (p.tyreProblemType === 'DAMAGED_OR_BLOWN_OUT') {
        baseBody = `Damage likely replacement. ${baseBody}`;
      }
      const body =
        p.lockingWheelNutStatus === 'NO_KEY'
          ? `🔴 URGENT: Missing locking nut key. Call customer immediately. ${baseBody}`
          : baseBody;
      return template(
        'booking.created',
        isAssessment ? 'New emergency assessment' : 'New emergency booking',
        body,
        makeData('booking.created', event.createdAt, {
          bookingId: p.bookingId,
          trackingId: p.trackingId,
        }),
      );
    }
    case 'booking.status.updated': {
      const p = event.payload as BookingStatusUpdatedPayload;
      const label = STATUS_LABELS[p.toStatus] ?? p.toStatus;
      return template(
        'booking.status.updated',
        'Booking status updated',
        `Booking ${p.trackingId} changed to ${label}.`,
        makeData('booking.status.updated', event.createdAt, {
          bookingId: p.bookingId,
          trackingId: p.trackingId,
        }),
      );
    }
    case 'payment.succeeded': {
      const p = event.payload as PaymentSucceededPayload;
      return template(
        'payment.succeeded',
        'Payment received',
        `Payment received for booking ${p.trackingId}.`,
        makeData('payment.succeeded', event.createdAt, {
          bookingId: p.bookingId,
          trackingId: p.trackingId,
        }),
      );
    }
    case 'payment.failed': {
      const p = event.payload as PaymentFailedPayload;
      return template(
        'payment.failed',
        'Payment failed',
        `Payment failed for booking ${p.trackingId}.`,
        makeData('payment.failed', event.createdAt, {
          bookingId: p.bookingId,
          trackingId: p.trackingId,
        }),
      );
    }
    case 'payment.refunded': {
      const p = event.payload as PaymentRefundedPayload;
      return template(
        'payment.refunded',
        'Payment refunded',
        `Booking ${p.trackingId} has been marked refunded.`,
        makeData('payment.refunded', event.createdAt, {
          bookingId: p.bookingId,
          trackingId: p.trackingId,
        }),
      );
    }
    case 'stock.low': {
      const p = event.payload as StockLowPayload;
      return template(
        'stock.low',
        'Low stock alert',
        `${p.sizeLabel} ${p.brand} ${p.model} is low on stock.`,
        makeData('stock.low', event.createdAt, { tyreId: p.tyreId }),
      );
    }
    case 'stock.updated': {
      const p = event.payload as StockUpdatedPayload;
      return template(
        'stock.updated',
        'Stock updated',
        `Stock changed for SKU ${p.sku}.`,
        makeData('stock.updated', event.createdAt, { tyreId: p.tyreId }),
      );
    }
    case 'pricing.rules.updated': {
      const _p = event.payload as PricingRulesUpdatedPayload;
      void _p;
      return template(
        'pricing.rules.updated',
        'Pricing rules updated',
        'Pricing controls were updated.',
        makeData('pricing.rules.updated', event.createdAt, {}),
      );
    }
    case 'pricing.override.updated': {
      const p = event.payload as PricingOverrideUpdatedPayload;
      return template(
        'pricing.override.updated',
        'Pricing override updated',
        `${p.label} is now ${p.status}.`,
        makeData('pricing.override.updated', event.createdAt, { overrideId: p.overrideId }),
      );
    }
    case 'visitor.updated': {
      const _p = event.payload as VisitorUpdatedPayload;
      void _p;
      return template(
        'visitor.updated',
        'Live visitor update',
        'Live visitor activity changed.',
        makeData('visitor.updated', event.createdAt, {}),
      );
    }
    case 'callback.requested': {
      const p = event.payload as CallbackRequestedPayload;
      return template(
        'callback.requested',
        'New call-back request',
        'A customer asked for a call back. Open the admin app to view details.',
        makeData('callback.requested', event.createdAt, { callbackRequestId: p.callbackRequestId }),
      );
    }
    case 'booking.adjustment.created': {
      const p = event.payload as BookingAdjustmentCreatedPayload;
      return template(
        'booking.adjustment.created',
        'Replacement quote created',
        `Booking ${p.trackingId} now has a replacement quote of £${p.additionalAmountGbp} for the customer to pay.`,
        makeData('booking.adjustment.created', event.createdAt, {
          bookingId: p.bookingId,
          trackingId: p.trackingId,
          adjustmentId: p.adjustmentId,
        }),
      );
    }
    case 'booking.adjustment.paid': {
      const p = event.payload as BookingAdjustmentPaidPayload;
      return template(
        'booking.adjustment.paid',
        'Replacement payment received',
        `Booking ${p.trackingId} replacement payment of £${p.amountGbp} received.`,
        makeData('booking.adjustment.paid', event.createdAt, {
          bookingId: p.bookingId,
          trackingId: p.trackingId,
          adjustmentId: p.adjustmentId,
        }),
      );
    }
    case 'lead.call.clicked': {
      const p = event.payload as LeadCallClickedPayload;
      const hasPhone = !!(p.phone && p.phone.length > 0);
      const body = hasPhone
        ? 'A customer clicked call from the website. Open Quick Booking.'
        : 'Someone clicked the website call button. Open Quick Booking if the phone rings.';
      return template(
        'lead.call.clicked',
        'Possible customer call',
        body,
        makeData('lead.call.clicked', event.createdAt, {
          callClickEventId: p.callClickEventId,
          ...(p.phone ? { phone: p.phone } : {}),
          ...(p.customerName ? { customerName: p.customerName } : {}),
          ...(p.tyreProblemType ? { tyreProblemType: p.tyreProblemType } : {}),
          ...(p.jobType ? { jobType: p.jobType } : {}),
          ...(p.sourcePage ? { sourcePage: p.sourcePage } : {}),
        }),
      );
    }
    case 'payment.deposit.succeeded': {
      const p = event.payload as PaymentDepositSucceededPayload;
      return template(
        'payment.deposit.succeeded',
        'Deposit paid',
        `Booking ${p.trackingId} is confirmed with a 15% deposit. Balance due £${p.balanceDueGbp}.`,
        makeData('payment.deposit.succeeded', event.createdAt, {
          bookingId: p.bookingId,
          trackingId: p.trackingId,
        }),
      );
    }
    case 'payment.balance.succeeded': {
      const p = event.payload as PaymentBalanceSucceededPayload;
      return template(
        'payment.balance.succeeded',
        'Balance paid',
        `Booking ${p.trackingId} balance has been paid.`,
        makeData('payment.balance.succeeded', event.createdAt, {
          bookingId: p.bookingId,
          trackingId: p.trackingId,
        }),
      );
    }
    case 'emergency_assist.created': {
      const p = event.payload as EmergencyAssistCreatedPayload;
      const hasPhone = !!(p.customerPhone && p.customerPhone.length > 0);
      const body = hasPhone
        ? `A customer clicked I need help now on the quote page. Phone: ${p.customerPhone}.`
        : 'A customer clicked I need help now on the quote page.';
      return template(
        'emergency_assist.created',
        'Emergency assist started',
        body,
        makeData('emergency_assist.created', event.createdAt, {
          emergencyAssistEventId: p.eventId,
          ...(p.customerPhone ? { phone: p.customerPhone } : {}),
          ...(p.vehicleRegistration ? { vehicleRegistration: p.vehicleRegistration } : {}),
          ...(p.locationLabel ? { locationLabel: p.locationLabel } : {}),
          ...(p.tyreProblemType ? { tyreProblemType: p.tyreProblemType } : {}),
          ...(p.jobType ? { jobType: p.jobType } : {}),
          sourcePage: p.page,
        }),
      );
    }
    case 'booking.checkout.started': {
      const p = event.payload as BookingCheckoutStartedPayload;
      let ageStr = '';
      if (p.quoteCreatedAt) {
        const ageMin = Math.max(
          0,
          Math.round((Date.now() - new Date(p.quoteCreatedAt).getTime()) / 60_000),
        );
        ageStr =
          ageMin >= 60
            ? ` (quote ${Math.round(ageMin / 60)}h old)`
            : ` (quote ${ageMin}m old)`;
      }
      const isAssessment = p.jobType === 'ASSESSMENT';
      const body = isAssessment
        ? `Customer is paying for emergency assessment (£${p.totalPriceGbp})${ageStr}.`
        : `Customer is paying £${p.totalPriceGbp} (${p.paymentMode === 'DEPOSIT' ? 'deposit' : 'full'})${ageStr}.`;
      return template(
        'booking.checkout.started',
        'Customer at checkout',
        body,
        makeData('booking.checkout.started', event.createdAt, {
          ...(p.tyreProblemType ? { tyreProblemType: p.tyreProblemType } : {}),
          jobType: p.jobType,
          sourcePage: p.page,
        }),
      );
    }
    default:
      return null;
  }
}
