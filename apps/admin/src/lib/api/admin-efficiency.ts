/**
 * Admin Efficiency Pack — admin-side API client.
 * One module to keep imports tidy across the new components.
 */
import { apiDelete, apiGet, apiPatch, apiPost } from './client';
import type {
  AdminMessageTemplateKey,
  InternalNote,
  InternalNoteType,
  MessageTemplatesResponse,
  PromoBannerSettings,
  PublicPromoBanner,
  PublicServiceAvailability,
  QuickBookingInput,
  QuickBookingResponse,
  RiskNote,
  RiskNoteType,
  ServiceAvailabilitySettings,
} from '@/types/admin-efficiency';

/* ---------------- Internal notes (F5) ---------------- */
export function listInternalNotes(bookingId: string): Promise<{ notes: InternalNote[] }> {
  return apiGet(`/api/admin/bookings/${bookingId}/notes`);
}
export function createInternalNote(
  bookingId: string,
  body: { body: string; noteType?: InternalNoteType; pinned?: boolean },
): Promise<{ note: InternalNote }> {
  return apiPost(`/api/admin/bookings/${bookingId}/notes`, body);
}
export function updateInternalNote(
  bookingId: string,
  noteId: string,
  body: { body?: string; noteType?: InternalNoteType; pinned?: boolean },
): Promise<{ note: InternalNote }> {
  return apiPatch(`/api/admin/bookings/${bookingId}/notes/${noteId}`, body);
}
export function deleteInternalNote(
  bookingId: string,
  noteId: string,
): Promise<{ success: true }> {
  return apiDelete(`/api/admin/bookings/${bookingId}/notes/${noteId}`);
}

/* ---------------- Risk notes (F8) ---------------- */
export function listRiskNotes(params: {
  customerPhone?: string;
  customerId?: string;
}): Promise<{ notes: RiskNote[] }> {
  const qs = new URLSearchParams();
  if (params.customerPhone) qs.set('customerPhone', params.customerPhone);
  if (params.customerId) qs.set('customerId', params.customerId);
  return apiGet(`/api/admin/customers/risk-notes?${qs.toString()}`);
}
export function createRiskNote(body: {
  customerPhone: string;
  customerId?: string;
  noteType?: RiskNoteType;
  body: string;
}): Promise<{ noteId: string }> {
  return apiPost(`/api/admin/customers/risk-notes`, body);
}
export function updateRiskNote(
  noteId: string,
  body: { body?: string; archived?: boolean },
): Promise<{ success: true }> {
  return apiPatch(`/api/admin/customers/risk-notes/${noteId}`, body);
}

/* ---------------- Message templates (F3) ---------------- */
export function getMessageTemplates(args?: {
  templateKey?: AdminMessageTemplateKey;
  bookingId?: string;
}): Promise<MessageTemplatesResponse> {
  const qs = new URLSearchParams();
  if (args?.templateKey) qs.set('templateKey', args.templateKey);
  if (args?.bookingId) qs.set('bookingId', args.bookingId);
  const q = qs.toString();
  return apiGet(`/api/admin/message-templates${q ? `?${q}` : ''}`);
}

export function updateMessageTemplate(body: {
  templateKey: AdminMessageTemplateKey;
  /** Send an empty string (or omit) to restore the default. */
  template?: string;
}): Promise<MessageTemplatesResponse> {
  return apiPatch(`/api/admin/message-templates`, body);
}

/* ---------------- No-answer (F1) ---------------- */
export function markBookingNoAnswer(
  bookingId: string,
  body: { sendFollowUpSms?: boolean; note?: string },
): Promise<{
  success: true;
  smsSent: boolean;
  smsSkippedReason?: string | null;
  whatsappLink?: string | null;
  alreadyMarkedRecently?: boolean;
  lastMarkedAt?: string | null;
}> {
  return apiPost(`/api/admin/bookings/${bookingId}/contact/no-answer`, body);
}

/* ---------------- Send location request (F13) ---------------- */
export function sendLocationRequest(
  bookingId: string,
): Promise<{
  success: true;
  smsSent: boolean;
  expiresAt: string;
  expiresInMinutes: number;
  url: string;
}> {
  return apiPost(`/api/admin/bookings/${bookingId}/send-location-request`, { channel: 'sms' });
}

/* ---------------- Promo banner (F10) ---------------- */
export function getPromoBanner(): Promise<PromoBannerSettings> {
  return apiGet(`/api/admin/settings/promo-banner`);
}
export function updatePromoBanner(body: PromoBannerSettings): Promise<PromoBannerSettings> {
  return apiPatch(`/api/admin/settings/promo-banner`, body);
}

/* ---------------- Service availability (F11) ---------------- */
export function getServiceAvailability(): Promise<ServiceAvailabilitySettings> {
  return apiGet(`/api/admin/settings/service-availability`);
}
export function updateServiceAvailability(
  body: ServiceAvailabilitySettings,
): Promise<ServiceAvailabilitySettings> {
  return apiPatch(`/api/admin/settings/service-availability`, body);
}

/* ---------------- Public banners (used inside Today/Operational settings preview) ---- */
export function previewPublicPromoBanner(baseUrl: string): Promise<PublicPromoBanner> {
  return apiGet(`${baseUrl}/api/public/promo-banner`);
}
export function previewPublicServiceAvailability(
  baseUrl: string,
): Promise<PublicServiceAvailability> {
  return apiGet(`${baseUrl}/api/public/service-availability`);
}

/* ---------------- Stock fast-fit (F7) ---------------- */
export function setStockFastFit(
  stockId: string,
  fastFitAvailable: boolean,
): Promise<{ success: true; fastFitAvailable: boolean }> {
  return apiPatch(`/api/admin/stock/${stockId}/fast-fit`, { fastFitAvailable });
}

/* ---------------- Quick booking (F14) ---------------- */
export function createQuickBooking(input: QuickBookingInput): Promise<QuickBookingResponse> {
  return apiPost(`/api/admin/quick-booking`, input);
}
