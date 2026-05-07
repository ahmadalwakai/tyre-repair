import { apiGet } from './client';
import type { MapboxLocationResponse } from '@/types/command-center';

export async function getMapboxLocation(bookingId: string): Promise<MapboxLocationResponse> {
  return apiGet<MapboxLocationResponse>(`/api/admin/bookings/${bookingId}/mapbox-location`);
}
