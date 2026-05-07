import { Alert } from 'react-native';
import {
  sendBookingPaymentLink,
  sendBookingBalancePaymentLink,
  type SendPaymentLinkResponse,
} from '@/lib/api/adjustments';
import { ApiError } from '@/lib/api/client';

/**
 * Item 14 \u2014 wraps a send-payment-link call so that an `alreadySentRecently`
 * response prompts the operator to confirm a force-resend.
 */
export async function sendBookingPaymentLinkWithConfirm(
  bookingId: string,
  payload: {
    method: 'sms' | 'email' | 'both';
    paymentPurpose: 'booking' | 'adjustment';
    adjustmentId?: string;
  },
): Promise<SendPaymentLinkResponse | null> {
  try {
    const r = await sendBookingPaymentLink(bookingId, payload);
    if (r.alreadySentRecently) {
      return new Promise<SendPaymentLinkResponse | null>((resolve) => {
        Alert.alert(
          'Recently sent',
          r.message ?? 'A payment link was sent very recently. Send another one anyway?',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
            {
              text: 'Send again',
              style: 'destructive',
              onPress: () => {
                void sendBookingPaymentLink(bookingId, { ...payload, force: true })
                  .then(resolve)
                  .catch(() => resolve(null));
              },
            },
          ],
        );
      });
    }
    return r;
  } catch (e) {
    Alert.alert('Send failed', e instanceof ApiError ? e.message : 'Unknown error');
    return null;
  }
}

export async function sendBookingBalanceLinkWithConfirm(
  bookingId: string,
  method: 'sms' | 'email' | 'both',
): Promise<SendPaymentLinkResponse | null> {
  try {
    const r = await sendBookingBalancePaymentLink(bookingId, { method });
    if (r.alreadySentRecently) {
      return new Promise<SendPaymentLinkResponse | null>((resolve) => {
        Alert.alert(
          'Recently sent',
          r.message ?? 'A balance link was sent very recently. Send another one anyway?',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
            {
              text: 'Send again',
              style: 'destructive',
              onPress: () => {
                void sendBookingBalancePaymentLink(bookingId, { method, force: true })
                  .then(resolve)
                  .catch(() => resolve(null));
              },
            },
          ],
        );
      });
    }
    return r;
  } catch (e) {
    Alert.alert('Send failed', e instanceof ApiError ? e.message : 'Unknown error');
    return null;
  }
}
