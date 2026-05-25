/**
 * Unified incoming-lead model for the Android admin app.
 *
 * Used by NotificationProvider, the lead-queue helper, the popups
 * (`IncomingCallQuickBookingPopup` + `EmergencyAssistPopup`) and the
 * Incoming Leads screen.
 *
 * One lead represents a single inbound signal from a customer:
 *   - CALL_CLICK         — customer tapped the public Call Now / tel: link.
 *   - EMERGENCY_ASSIST   — customer pressed "I need help now" on /quote.
 *   - CALLBACK_REQUEST   — customer submitted a callback request form.
 *
 * Leads flow through statuses:
 *   NEW → VIEWED → IN_PROGRESS → HANDLED
 *   NEW → DISMISSED
 *   NEW → EXPIRED (auto, after a per-type timeout)
 *
 * Only NEW/VIEWED leads should ever drive a blocking popup. IN_PROGRESS
 * leads remain in the active queue (admin started Quick Booking) but no
 * longer block the screen. HANDLED/DISMISSED/EXPIRED leads belong in the
 * history list only.
 */

export type IncomingLeadType =
  | 'CALL_CLICK'
  | 'EMERGENCY_ASSIST'
  | 'CALLBACK_REQUEST';

export type IncomingLeadStatus =
  | 'NEW'
  | 'VIEWED'
  | 'IN_PROGRESS'
  | 'HANDLED'
  | 'DISMISSED'
  | 'EXPIRED';

export type IncomingLeadPriority = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';

/** Strict, JSON-safe metadata bag — no `any`. */
export type IncomingLeadMetadataValue =
  | string
  | number
  | boolean
  | null
  | undefined;

export type IncomingLeadMetadata = Record<string, IncomingLeadMetadataValue>;

export interface IncomingLead {
  /** Stable internal id. Prefer the upstream eventId when available. */
  id: string;
  type: IncomingLeadType;
  status: IncomingLeadStatus;
  priority: IncomingLeadPriority;
  priorityScore: number;

  title: string;
  subtitle?: string;

  phone?: string;
  customerName?: string;

  sourcePage?: string;
  sourceComponent?: string;

  callClickEventId?: string;
  emergencyAssistEventId?: string;
  callbackRequestId?: string;

  tyreProblemType?: string;
  jobType?: string;
  vehicleRegistration?: string;

  locationLabel?: string;
  latitude?: number;
  longitude?: number;
  locationConfidence?: string;

  createdAt: string;
  updatedAt: string;
  lastSignalAt?: string;

  linkedBookingId?: string;
  trackingId?: string;

  metadata?: IncomingLeadMetadata;
}
