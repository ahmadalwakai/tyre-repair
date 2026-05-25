import { apiGet, apiPatch, apiPost } from './client';
import type {
  BookingDetail,
  BookingDetailExtended,
  BookingListResponse,
  BookingStatus,
  CreateBookingInput,
} from '@/types/bookings';

export interface BookingListQuery {
  status?: string;
  search?: string;
  cursor?: string;
  limit?: number;
  /* Item 12 — extended search & filters */
  q?: string;
  trackingId?: string;
  customerPhone?: string;
  customerName?: string;
  bookingStatus?: BookingStatus;
  paymentStatus?: string;
  jobType?: 'ASSESSMENT' | 'REPLACEMENT';
  assessmentOnly?: boolean;
  replacementOnly?: boolean;
  missingLockingNutKey?: boolean;
  depositPaid?: boolean;
  balanceDue?: boolean;
  paymentFailed?: boolean;
  cancelled?: boolean;
  completed?: boolean;
  createdFrom?: string;
  createdTo?: string;
  page?: number;
  pageSize?: number;
  /** Buy Tyres source filter. */
  source?: 'all' | 'tyre_shop' | 'emergency' | 'admin_phone' | 'public_quote';
}

export function listBookings(q: BookingListQuery = {}): Promise<BookingListResponse> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(q)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return apiGet<BookingListResponse>(`/api/admin/bookings${qs ? `?${qs}` : ''}`);
}

export function getBooking(bookingId: string): Promise<BookingDetail> {
  return apiGet<BookingDetail>(`/api/admin/bookings/${bookingId}`);
}

/** Item 6 — returns the extended detail with paymentRisk, timeline, contact history etc. */
export function getBookingDetail(bookingId: string): Promise<BookingDetailExtended> {
  return apiGet<BookingDetailExtended>(`/api/admin/bookings/${bookingId}`);
}

export function updateBookingStatus(
  bookingId: string,
  toStatus: BookingStatus,
  message?: string,
): Promise<{ success: boolean; status: BookingStatus }> {
  const body: Record<string, unknown> = { toStatus };
  if (message) body['message'] = message;
  return apiPatch<{ success: boolean; status: BookingStatus }>(
    `/api/admin/bookings/${bookingId}/status`,
    body,
  );
}

export function createManualBooking(input: CreateBookingInput): Promise<{
  bookingId: string;
  trackingId: string;
  status: string;
  paymentStatus: string;
}> {
  return apiPost('/api/admin/bookings', input);
}
