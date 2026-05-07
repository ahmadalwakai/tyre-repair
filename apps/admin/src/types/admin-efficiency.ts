/**
 * Admin Efficiency Pack — shared admin-side types.
 *
 * Mirrors response shapes of:
 *  - /api/admin/bookings/:id/notes
 *  - /api/admin/customers/risk-notes
 *  - /api/admin/message-templates
 *  - /api/admin/settings/promo-banner
 *  - /api/admin/settings/service-availability
 *  - /api/admin/quick-booking
 *  - /api/admin/today (nextBestAction field)
 */

export type InternalNoteType =
  | 'GENERAL'
  | 'CUSTOMER_INFO'
  | 'PAYMENT_INFO'
  | 'LOCATION_INFO'
  | 'TYRE_INFO'
  | 'DISPATCH_NOTE'
  | 'ISSUE';

export interface InternalNote {
  id: string;
  bookingId: string;
  noteType: InternalNoteType;
  body: string;
  pinned: boolean;
  authorEmail: string | null;
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
}

export type RiskNoteType =
  | 'GENERAL_NOTE'
  | 'REPEATED_NO_ANSWER'
  | 'PREVIOUS_NO_SHOW'
  | 'PREFERS_WHATSAPP'
  | 'NEEDS_LOCATION_CONFIRMATION'
  | 'PAYMENT_SENSITIVE';

export interface RiskNote {
  id: string;
  customerPhone: string;
  customerId: string | null;
  noteType: RiskNoteType;
  body: string;
  authorEmail: string | null;
  authorName: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AdminMessageTemplateKey =
  | 'PAYMENT_LINK_SMS'
  | 'PAYMENT_LINK_WHATSAPP'
  | 'BALANCE_DUE_SMS'
  | 'BALANCE_DUE_WHATSAPP'
  | 'TECHNICIAN_ON_THE_WAY_SMS'
  | 'NO_ANSWER_FOLLOW_UP_SMS'
  | 'LOCATION_REQUEST_SMS'
  | 'JOB_COMPLETE_THANKS_SMS'
  | 'CALLBACK_ACKNOWLEDGEMENT_SMS';

export interface AdminMessageTemplate {
  key: AdminMessageTemplateKey;
  label: string;
  description: string;
  variables: ReadonlyArray<string>;
  template: string;
}

export interface MessageTemplatesResponse {
  templates: AdminMessageTemplate[];
  renderedMessage?: string;
  customerPhone?: string | null;
}

export type PromoBannerVariant = 'INFO' | 'WARNING' | 'EMERGENCY';

export interface PromoBannerSettings {
  enabled: boolean;
  message: string;
  variant: PromoBannerVariant;
}

export type ServiceAvailabilityMode =
  | 'NORMAL'
  | 'HIGH_DEMAND'
  | 'CALL_FIRST'
  | 'TEMPORARILY_LIMITED';

export interface ServiceAvailabilitySettings {
  mode: ServiceAvailabilityMode;
  customDetail: string | null;
}

export interface PublicPromoBanner {
  banner: { message: string; variant: PromoBannerVariant } | null;
}

export interface PublicServiceAvailability {
  mode: ServiceAvailabilityMode;
  headline: string;
  detail: string;
}

export interface QuickBookingInput {
  customerName?: string;
  customerPhone: string;
  customerEmail?: string;
  problemType?: string;
  jobType?: 'ASSESSMENT' | 'REPLACEMENT';
  lockingWheelNutStatus?: 'HAVE_KEY' | 'NO_KEY' | 'STANDARD_ONLY';
  locationLabel?: string;
  latitude?: number;
  longitude?: number;
  internalNote?: string;
  source?: string;
  tyreId?: string;
  /**
   * Admin-chosen payment plan. CASH = collect on site (no Stripe URL).
   * DEPOSIT/FULL = backend will return a paymentUrl for Stripe Payment Element.
   */
  paymentMode?: 'CASH' | 'DEPOSIT' | 'FULL';
  /** Snapshot of the live price quote total (£). Required for DEPOSIT/FULL. */
  totalPriceGbp?: string;
}

export interface QuickBookingResponse {
  bookingId: string;
  trackingId: string;
  paymentMode?: 'CASH' | 'DEPOSIT' | 'FULL';
  depositAmountGbp?: string;
  balanceDueGbp?: string;
  /** Public Stripe Payment Element URL for admin-led card payment. */
  paymentUrl?: string;
}

export interface NextBestAction {
  type: string;
  title: string;
  detail: string;
  bookingId?: string | null;
  trackingId?: string | null;
  callbackRequestId?: string | null;
  stockId?: string | null;
  actionTarget?: string | null;
  emergencyAssistEventId?: string | null;
  phone?: string | null;
}
