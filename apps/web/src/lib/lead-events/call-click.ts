/**
 * Fire-and-forget call click event reporter. Must NEVER block the user's `tel:` link.
 * Uses navigator.sendBeacon when available (survives page unload), falls back to fetch keepalive.
 */
export interface CallClickEventInput {
  sourcePage?: string | undefined;
  sourceComponent?: string | undefined;
  quoteId?: string | undefined;
  bookingId?: string | undefined;
  phone?: string | undefined;
  customerName?: string | undefined;
  tyreProblemType?:
    | 'PUNCTURE_OR_FLAT'
    | 'DAMAGED_OR_BLOWN_OUT'
    | 'SLOW_PRESSURE_LOSS'
    | 'NEEDS_REPLACEMENT'
    | 'NOT_SURE'
    | undefined;
  jobType?: 'ASSESSMENT' | 'REPLACEMENT' | undefined;
  locationSummary?: string | undefined;
  href?: string | undefined;
  referrer?: string | undefined;
}

const SESSION_KEY = 'tyrerepair:lead-session-id:v1';

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `s_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return '';
  }
}

export function reportCallClick(input: CallClickEventInput = {}): void {
  if (typeof window === 'undefined') return;
  const sourcePage = input.sourcePage ?? window.location.pathname;
  const sessionId = getSessionId();
  const href = input.href ?? (() => { try { return window.location.href; } catch { return undefined; } })();
  const referrer = input.referrer ?? (() => { try { return document.referrer || undefined; } catch { return undefined; } })();
  const payload: Record<string, unknown> = { sessionId, sourcePage };
  if (input.sourceComponent) payload['sourceComponent'] = input.sourceComponent;
  if (input.quoteId) payload['quoteId'] = input.quoteId;
  if (input.bookingId) payload['bookingId'] = input.bookingId;
  if (input.phone) payload['phone'] = input.phone;
  if (input.customerName) payload['customerName'] = input.customerName;
  if (input.tyreProblemType) payload['tyreProblemType'] = input.tyreProblemType;
  if (input.jobType) payload['jobType'] = input.jobType;
  if (input.locationSummary) payload['locationSummary'] = input.locationSummary;
  if (href) payload['href'] = href;
  if (referrer) payload['referrer'] = referrer;

  const url = '/api/lead-events/call-click';
  const body = JSON.stringify(payload);

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      const ok = navigator.sendBeacon(url, blob);
      if (ok) return;
    }
  } catch {
    // fall through
  }

  try {
    void fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // swallow
  }
}
