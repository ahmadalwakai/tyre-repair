import { apiGet } from './client';

export interface AdminSearchBookingHit {
  bookingId: string;
  trackingId: string;
  status: string;
  paymentStatus: string;
  jobType: string;
  customerName: string | null;
  customerPhone: string | null;
  vehicleRegistration: string | null;
  createdAt: string;
}

export interface AdminSearchCustomerHit {
  customerId: string;
  fullName: string | null;
  phone: string;
  email: string | null;
  bookingsCount: number;
  lastBookingTrackingId: string | null;
  lastBookingId: string | null;
  lastBookingCreatedAt: string | null;
}

export interface AdminSearchResponse {
  q: string;
  bookings: AdminSearchBookingHit[];
  customers: AdminSearchCustomerHit[];
}

export function adminGlobalSearch(
  q: string,
  signal?: AbortSignal,
): Promise<AdminSearchResponse> {
  const params = new URLSearchParams({ q });
  const path = `/api/admin/search?${params.toString()}`;
  return signal
    ? apiGet<AdminSearchResponse>(path, { signal })
    : apiGet<AdminSearchResponse>(path);
}
