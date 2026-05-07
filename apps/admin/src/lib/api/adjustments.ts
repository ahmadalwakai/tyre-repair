import { apiPost } from './client';

export interface ConvertToReplacementResponse {
  success: true;
  adjustment: {
    id: string;
    additionalAmountGbp: string;
    totalReplacementAmountGbp: string;
    originalPaidAmountGbp: string;
    paymentLinkUrl: string;
  };
}

export async function convertBookingToReplacement(
  bookingId: string,
  payload: { tyreId: string; notes?: string },
): Promise<ConvertToReplacementResponse> {
  return apiPost<ConvertToReplacementResponse>(
    `/api/admin/bookings/${bookingId}/convert-to-replacement`,
    payload,
  );
}

export interface SendPaymentLinkResponse {
  success: true;
  paymentUrl: string;
  amountGbp?: string;
  sentSms: boolean;
  sentEmail: boolean;
  smsSkippedReason?: 'missing_credentials' | 'send_failed' | 'no_phone';
  emailSkippedReason?: 'missing_credentials' | 'send_failed' | 'no_email';
  /** Item 14 — idempotency: server already sent a link in the last RECENT_WINDOW_SECONDS. */
  alreadySentRecently?: boolean;
  lastSentAt?: string | null;
  message?: string;
}

export async function sendBookingPaymentLink(
  bookingId: string,
  payload: {
    method: 'sms' | 'email' | 'both';
    paymentPurpose: 'booking' | 'adjustment';
    adjustmentId?: string;
    /** Item 14 — set true on confirm-after-recent-send retry. */
    force?: boolean;
  },
): Promise<SendPaymentLinkResponse> {
  return apiPost<SendPaymentLinkResponse>(
    `/api/admin/bookings/${bookingId}/send-payment-link`,
    payload,
  );
}

export async function sendBookingBalancePaymentLink(
  bookingId: string,
  payload: {
    method: 'sms' | 'email' | 'both';
    /** Item 14 — set true on confirm-after-recent-send retry. */
    force?: boolean;
  },
): Promise<SendPaymentLinkResponse> {
  return apiPost<SendPaymentLinkResponse>(
    `/api/admin/bookings/${bookingId}/send-balance-payment-link`,
    payload,
  );
}
