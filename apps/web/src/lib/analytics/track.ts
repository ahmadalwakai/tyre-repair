/**
 * Lightweight, typed analytics wrapper.
 *
 * Pushes events to `window.dataLayer` if present (GTM convention). When no
 * dataLayer exists the call is a silent no-op, so analytics never blocks the
 * call/booking flow. No hardcoded Google Ads, GA4, or third-party IDs.
 *
 * Server-side usage is also safe — the helpers detect a missing `window`.
 */

export type LandingTrackingEvent =
  | 'postcode_submit'
  | 'postcode_available_now'
  | 'postcode_available_today'
  | 'postcode_available_tomorrow'
  | 'postcode_not_covered'
  | 'out_of_coverage_postcode'
  | 'call_click'
  | 'whatsapp_click'
  | 'booking_start'
  | 'quote_request';

export interface TrackEventPayload {
  [key: string]: string | number | boolean | null | undefined;
}

interface DataLayerEntry extends TrackEventPayload {
  event: LandingTrackingEvent;
}

interface WindowWithDataLayer extends Window {
  dataLayer?: DataLayerEntry[];
}

export function trackEvent(
  event: LandingTrackingEvent,
  payload: TrackEventPayload = {},
): void {
  try {
    if (typeof window === 'undefined') return;
    const w = window as WindowWithDataLayer;
    if (!Array.isArray(w.dataLayer)) {
      w.dataLayer = [];
    }
    w.dataLayer.push({ event, ...payload });
  } catch {
    // Analytics must never throw into UI flow.
  }
}

export function trackPostcodeResultEvent(
  status: 'available_now' | 'available_today' | 'available_tomorrow' | 'not_currently_covered',
  payload: TrackEventPayload,
): void {
  const eventMap: Record<typeof status, LandingTrackingEvent> = {
    available_now: 'postcode_available_now',
    available_today: 'postcode_available_today',
    available_tomorrow: 'postcode_available_tomorrow',
    not_currently_covered: 'postcode_not_covered',
  };
  trackEvent(eventMap[status], payload);
  if (status === 'not_currently_covered') {
    trackEvent('out_of_coverage_postcode', payload);
  }
}
