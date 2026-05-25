import { apiGet, apiPatch } from './client';

export type CallClickHandledAction =
  | 'DISMISSED'
  | 'STARTED_QUICK_BOOKING'
  | 'CALLED_CUSTOMER'
  | 'OPENED_QUICK_BOOKING';

export interface RecentUnhandledCallClick {
  id: string;
  sessionId: string | null;
  sourcePage: string | null;
  sourceComponent: string | null;
  quoteId: string | null;
  bookingId: string | null;
  phone: string | null;
  customerName: string | null;
  tyreProblemType: string | null;
  jobType: 'ASSESSMENT' | 'REPLACEMENT' | null;
  locationSummary: string | null;
  networkCity: string | null;
  networkRegion: string | null;
  networkCountry: string | null;
  createdAt: string;
}

export interface RecentUnhandledResponse {
  items: RecentUnhandledCallClick[];
  minutes: number;
  limit: number;
}

export interface AcknowledgeCallClickResponse {
  id: string;
  acknowledgedAt: string | null;
  handledAt: string | null;
  handledAction: string | null;
}

export function getRecentUnhandledCallClicks(
  opts?: { minutes?: number; limit?: number; signal?: AbortSignal },
): Promise<RecentUnhandledResponse> {
  const minutes = opts?.minutes ?? 30;
  const limit = opts?.limit ?? 5;
  const path = `/api/admin/call-click-events/recent-unhandled?minutes=${encodeURIComponent(
    String(minutes),
  )}&limit=${encodeURIComponent(String(limit))}`;
  return apiGet<RecentUnhandledResponse>(path, opts?.signal ? { signal: opts.signal } : undefined);
}

export function acknowledgeCallClick(
  eventId: string,
  action: CallClickHandledAction,
): Promise<AcknowledgeCallClickResponse> {
  return apiPatch<AcknowledgeCallClickResponse>(
    `/api/admin/call-click-events/${encodeURIComponent(eventId)}/acknowledge`,
    { action },
  );
}
