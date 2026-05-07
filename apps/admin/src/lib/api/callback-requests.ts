import { apiGet, apiPatch } from './client';

export type CallbackRequestStatus = 'new' | 'contacted' | 'converted' | 'closed';

export interface CallbackRequest {
  id: string;
  fullName: string | null;
  phone: string;
  email: string | null;
  tyreProblemType:
    | 'PUNCTURE_OR_FLAT'
    | 'DAMAGED_OR_BLOWN_OUT'
    | 'SLOW_PRESSURE_LOSS'
    | 'NEEDS_REPLACEMENT'
    | 'NOT_SURE'
    | null;
  message: string | null;
  sourcePage: string | null;
  source: string | null;
  locationLabel: string | null;
  latitude: number | null;
  longitude: number | null;
  status: CallbackRequestStatus;
  createdAt: string;
  updatedAt: string;
}

interface ListResponse {
  items: CallbackRequest[];
  count: number;
}

export async function listCallbackRequests(limit = 50): Promise<ListResponse> {
  return apiGet<ListResponse>(`/api/admin/callback-requests?limit=${limit}`);
}

export async function updateCallbackRequestStatus(
  callbackRequestId: string,
  status: CallbackRequestStatus,
): Promise<{ success: true }> {
  return apiPatch<{ success: true }>(`/api/admin/callback-requests`, {
    callbackRequestId,
    status,
  });
}
