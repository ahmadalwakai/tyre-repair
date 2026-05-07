import { apiPost } from './client';

export interface RecoverySmsResponse {
  ok: boolean;
  sentTo?: string;
  trackingId?: string;
  error?: string;
  skipped?: string;
}

export function sendRecoverySms(bookingId: string): Promise<RecoverySmsResponse> {
  return apiPost<RecoverySmsResponse>(`/api/admin/bookings/${bookingId}/recovery-sms`);
}

export interface CancelPendingResponse {
  ok: boolean;
  bookingId?: string;
  trackingId?: string;
  error?: string;
}

export function cancelPendingBooking(bookingId: string): Promise<CancelPendingResponse> {
  return apiPost<CancelPendingResponse>(`/api/admin/bookings/${bookingId}/cancel-pending`);
}
