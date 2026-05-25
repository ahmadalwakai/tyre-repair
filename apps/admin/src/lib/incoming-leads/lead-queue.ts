/**
 * Lead queue helpers — pure functions used by NotificationProvider to build,
 * deduplicate, score and sort incoming leads (Call Now / Emergency Assist
 * / Callback Request).
 *
 * No React, no IO, no side effects. Easy to reason about and easy to test.
 */

import type {
  IncomingLead,
  IncomingLeadMetadata,
  IncomingLeadPriority,
  IncomingLeadStatus,
  IncomingLeadType,
} from '@/types/incoming-leads';

// -- payload shapes ----------------------------------------------------------

export interface CallClickPayload {
  callClickEventId: string;
  phone?: string | null;
  customerName?: string | null;
  tyreProblemType?: string | null;
  jobType?: 'ASSESSMENT' | 'REPLACEMENT' | null;
  sourcePage?: string | null;
  sourceComponent?: string | null;
  networkCity?: string | null;
  networkRegion?: string | null;
  networkCountry?: string | null;
  receivedAt?: string | null;
}

export interface EmergencyAssistPayload {
  eventId: string;
  phone?: string | null;
  customerName?: string | null;
  tyreProblemType?: string | null;
  jobType?: 'ASSESSMENT' | 'REPLACEMENT' | null;
  vehicleRegistration?: string | null;
  sourcePage?: string | null;
  sourceComponent?: string | null;
  locationLabel?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locationConfidence?: string | null;
  receivedAt?: string | null;
}

export interface EmergencyLocationPayload {
  eventId: string;
  locationLabel?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locationConfidence?: string | null;
  updatedAt?: string | null;
}

export interface CallbackRequestPayload {
  callbackRequestId: string;
  phone?: string | null;
  customerName?: string | null;
  tyreProblemType?: string | null;
  sourcePage?: string | null;
  receivedAt?: string | null;
  message?: string | null;
}

// -- expiry windows ----------------------------------------------------------

export const LEAD_EXPIRY_MS: Record<IncomingLeadType, number> = {
  CALL_CLICK: 15 * 60 * 1000,
  EMERGENCY_ASSIST: 30 * 60 * 1000,
  CALLBACK_REQUEST: 60 * 60 * 1000,
};

const DEDUPE_WINDOW_MS = 10 * 60 * 1000;

// -- builders ---------------------------------------------------------------

function nowIso(): string {
  return new Date().toISOString();
}

function safeString(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  const trimmed = String(value).trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function safeNumber(value: number | null | undefined): number | undefined {
  if (typeof value !== 'number') return undefined;
  if (!Number.isFinite(value)) return undefined;
  return value;
}

export function createLeadFromCallClick(payload: CallClickPayload): IncomingLead {
  const created = payload.receivedAt ?? nowIso();
  const lead: IncomingLead = {
    id: `call-${payload.callClickEventId}`,
    type: 'CALL_CLICK',
    status: 'NEW',
    priority: 'NORMAL',
    priorityScore: 0,
    title: 'New website call',
    subtitle: payload.phone
      ? 'Customer tapped your phone number on the website.'
      : 'Someone just tapped your phone number on the website.',
    callClickEventId: payload.callClickEventId,
    createdAt: created,
    updatedAt: created,
    lastSignalAt: created,
  };
  const phone = safeString(payload.phone);
  if (phone) lead.phone = phone;
  const name = safeString(payload.customerName);
  if (name) lead.customerName = name;
  const problem = safeString(payload.tyreProblemType);
  if (problem) lead.tyreProblemType = problem;
  if (payload.jobType) lead.jobType = payload.jobType;
  const page = safeString(payload.sourcePage);
  if (page) lead.sourcePage = page;
  const component = safeString(payload.sourceComponent);
  if (component) lead.sourceComponent = component;
  const networkCity = safeString(payload.networkCity);
  const networkRegion = safeString(payload.networkRegion);
  const networkCountry = safeString(payload.networkCountry);
  if (networkCity || networkRegion || networkCountry) {
    lead.metadata = {
      ...(lead.metadata ?? {}),
      networkCity: networkCity ?? null,
      networkRegion: networkRegion ?? null,
      networkCountry: networkCountry ?? null,
    };
  }
  const score = scoreIncomingLead(lead);
  lead.priorityScore = score;
  lead.priority = priorityFromScore(score);
  return lead;
}

export function createLeadFromEmergencyAssist(
  payload: EmergencyAssistPayload,
): IncomingLead {
  const created = payload.receivedAt ?? nowIso();
  const lead: IncomingLead = {
    id: `ea-${payload.eventId}`,
    type: 'EMERGENCY_ASSIST',
    status: 'NEW',
    priority: 'NORMAL',
    priorityScore: 0,
    title: 'Emergency assist started',
    subtitle: 'A customer clicked "I need help now" on the quote page.',
    emergencyAssistEventId: payload.eventId,
    createdAt: created,
    updatedAt: created,
    lastSignalAt: created,
  };
  const phone = safeString(payload.phone);
  if (phone) lead.phone = phone;
  const name = safeString(payload.customerName);
  if (name) lead.customerName = name;
  const problem = safeString(payload.tyreProblemType);
  if (problem) lead.tyreProblemType = problem;
  if (payload.jobType) lead.jobType = payload.jobType;
  const reg = safeString(payload.vehicleRegistration);
  if (reg) lead.vehicleRegistration = reg;
  const page = safeString(payload.sourcePage);
  if (page) lead.sourcePage = page;
  const component = safeString(payload.sourceComponent);
  if (component) lead.sourceComponent = component;
  const label = safeString(payload.locationLabel);
  if (label) lead.locationLabel = label;
  const lat = safeNumber(payload.latitude);
  if (lat !== undefined) lead.latitude = lat;
  const lng = safeNumber(payload.longitude);
  if (lng !== undefined) lead.longitude = lng;
  const conf = safeString(payload.locationConfidence);
  if (conf) lead.locationConfidence = conf;
  const score = scoreIncomingLead(lead);
  lead.priorityScore = score;
  lead.priority = priorityFromScore(score);
  return lead;
}

export function createLeadFromCallbackRequest(
  payload: CallbackRequestPayload,
): IncomingLead {
  const created = payload.receivedAt ?? nowIso();
  const lead: IncomingLead = {
    id: `cb-${payload.callbackRequestId}`,
    type: 'CALLBACK_REQUEST',
    status: 'NEW',
    priority: 'NORMAL',
    priorityScore: 0,
    title: 'Callback request',
    subtitle: 'A customer is waiting for a call back.',
    callbackRequestId: payload.callbackRequestId,
    createdAt: created,
    updatedAt: created,
    lastSignalAt: created,
  };
  const phone = safeString(payload.phone);
  if (phone) lead.phone = phone;
  const name = safeString(payload.customerName);
  if (name) lead.customerName = name;
  const problem = safeString(payload.tyreProblemType);
  if (problem) lead.tyreProblemType = problem;
  const page = safeString(payload.sourcePage);
  if (page) lead.sourcePage = page;
  const message = safeString(payload.message);
  if (message) {
    const meta: IncomingLeadMetadata = { message };
    lead.metadata = meta;
  }
  const score = scoreIncomingLead(lead);
  lead.priorityScore = score;
  lead.priority = priorityFromScore(score);
  return lead;
}

// -- merge / mutate ---------------------------------------------------------

export function mergeLocationIntoLead(
  lead: IncomingLead,
  patch: EmergencyLocationPayload,
): IncomingLead {
  const updated: IncomingLead = {
    ...lead,
    updatedAt: patch.updatedAt ?? nowIso(),
    lastSignalAt: patch.updatedAt ?? nowIso(),
  };
  const label = safeString(patch.locationLabel);
  if (label) updated.locationLabel = label;
  const lat = safeNumber(patch.latitude);
  if (lat !== undefined) updated.latitude = lat;
  const lng = safeNumber(patch.longitude);
  if (lng !== undefined) updated.longitude = lng;
  const conf = safeString(patch.locationConfidence);
  if (conf) updated.locationConfidence = conf;
  const score = scoreIncomingLead(updated);
  updated.priorityScore = score;
  updated.priority = priorityFromScore(score);
  return updated;
}

// -- scoring / priority -----------------------------------------------------

export function scoreIncomingLead(lead: IncomingLead): number {
  const hasPhone = Boolean(lead.phone);
  const hasLocation =
    typeof lead.latitude === 'number' && typeof lead.longitude === 'number';

  let base = 0;
  switch (lead.type) {
    case 'CALL_CLICK':
      base = hasPhone ? 100 : 90;
      break;
    case 'EMERGENCY_ASSIST':
      if (hasPhone && hasLocation) base = 95;
      else if (hasLocation) base = 85;
      else if (hasPhone) base = 80;
      else base = 65;
      break;
    case 'CALLBACK_REQUEST':
      base = 55;
      break;
  }

  // Older active leads lose a small score after 15 minutes so a fresh
  // critical lead can take focus.
  const created = Date.parse(lead.createdAt);
  if (Number.isFinite(created)) {
    const ageMs = Date.now() - created;
    const decayMins = Math.max(0, Math.floor(ageMs / 60000) - 15);
    base -= Math.min(decayMins * 1, 20);
  }
  return base;
}

function priorityFromScore(score: number): IncomingLeadPriority {
  if (score >= 95) return 'CRITICAL';
  if (score >= 80) return 'HIGH';
  if (score >= 55) return 'NORMAL';
  return 'LOW';
}

// -- sorting ----------------------------------------------------------------

export function sortIncomingLeads(leads: IncomingLead[]): IncomingLead[] {
  return [...leads].sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) {
      return b.priorityScore - a.priorityScore;
    }
    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });
}

// -- dedupe / merge ---------------------------------------------------------

export interface DedupeOutcome {
  leads: IncomingLead[];
  /** True if `incoming` matched an existing lead and merged into it. */
  merged: boolean;
  /** True if `incoming` was a duplicate that should be ignored entirely. */
  ignored: boolean;
}

function withinDedupeWindow(a: string, b: string): boolean {
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return false;
  return Math.abs(ta - tb) <= DEDUPE_WINDOW_MS;
}

function mergeTwo(existing: IncomingLead, incoming: IncomingLead): IncomingLead {
  const merged: IncomingLead = {
    ...existing,
    updatedAt: incoming.updatedAt,
    lastSignalAt: incoming.updatedAt,
  };
  if (incoming.title) merged.title = incoming.title;
  const subtitle = incoming.subtitle ?? existing.subtitle;
  if (subtitle !== undefined) merged.subtitle = subtitle;
  const phone = existing.phone ?? incoming.phone;
  if (phone !== undefined) merged.phone = phone;
  const customerName = existing.customerName ?? incoming.customerName;
  if (customerName !== undefined) merged.customerName = customerName;
  const sourcePage = existing.sourcePage ?? incoming.sourcePage;
  if (sourcePage !== undefined) merged.sourcePage = sourcePage;
  const sourceComponent = existing.sourceComponent ?? incoming.sourceComponent;
  if (sourceComponent !== undefined) merged.sourceComponent = sourceComponent;
  const tyreProblemType = existing.tyreProblemType ?? incoming.tyreProblemType;
  if (tyreProblemType !== undefined) merged.tyreProblemType = tyreProblemType;
  const jobType = existing.jobType ?? incoming.jobType;
  if (jobType !== undefined) merged.jobType = jobType;
  const vehicleRegistration = existing.vehicleRegistration ?? incoming.vehicleRegistration;
  if (vehicleRegistration !== undefined) merged.vehicleRegistration = vehicleRegistration;
  const locationLabel = incoming.locationLabel ?? existing.locationLabel;
  if (locationLabel !== undefined) merged.locationLabel = locationLabel;
  const latitude = incoming.latitude ?? existing.latitude;
  if (latitude !== undefined) merged.latitude = latitude;
  const longitude = incoming.longitude ?? existing.longitude;
  if (longitude !== undefined) merged.longitude = longitude;
  const locationConfidence =
    incoming.locationConfidence ?? existing.locationConfidence;
  if (locationConfidence !== undefined) merged.locationConfidence = locationConfidence;
  const callClickEventId =
    existing.callClickEventId ?? incoming.callClickEventId;
  if (callClickEventId !== undefined) merged.callClickEventId = callClickEventId;
  const emergencyAssistEventId =
    existing.emergencyAssistEventId ?? incoming.emergencyAssistEventId;
  if (emergencyAssistEventId !== undefined) {
    merged.emergencyAssistEventId = emergencyAssistEventId;
  }
  const callbackRequestId =
    existing.callbackRequestId ?? incoming.callbackRequestId;
  if (callbackRequestId !== undefined) merged.callbackRequestId = callbackRequestId;
  const score = scoreIncomingLead(merged);
  merged.priorityScore = score;
  merged.priority = priorityFromScore(score);
  return merged;
}

export function dedupeIncomingLead(
  existingLeads: IncomingLead[],
  incoming: IncomingLead,
): DedupeOutcome {
  // 1. Same internal id — overwrite (location updates, repeats).
  const sameIdIndex = existingLeads.findIndex((l) => l.id === incoming.id);
  if (sameIdIndex >= 0) {
    const next = [...existingLeads];
    const prev = next[sameIdIndex];
    if (!prev) return { leads: existingLeads, merged: false, ignored: true };
    next[sameIdIndex] = mergeTwo(prev, incoming);
    return { leads: next, merged: true, ignored: false };
  }

  // 2. Same upstream event id — ignore exact duplicate.
  if (incoming.callClickEventId) {
    const dup = existingLeads.findIndex(
      (l) => l.callClickEventId === incoming.callClickEventId,
    );
    if (dup >= 0) return { leads: existingLeads, merged: false, ignored: true };
  }
  if (incoming.emergencyAssistEventId) {
    const dup = existingLeads.findIndex(
      (l) => l.emergencyAssistEventId === incoming.emergencyAssistEventId,
    );
    if (dup >= 0) {
      const next = [...existingLeads];
      const prev = next[dup];
      if (!prev) return { leads: existingLeads, merged: false, ignored: true };
      next[dup] = mergeTwo(prev, incoming);
      return { leads: next, merged: true, ignored: false };
    }
  }
  if (incoming.callbackRequestId) {
    const dup = existingLeads.findIndex(
      (l) => l.callbackRequestId === incoming.callbackRequestId,
    );
    if (dup >= 0) {
      const next = [...existingLeads];
      const prev = next[dup];
      if (!prev) return { leads: existingLeads, merged: false, ignored: true };
      next[dup] = mergeTwo(prev, incoming);
      return { leads: next, merged: true, ignored: false };
    }
  }

  // 3. Same active phone within 10 minutes — merge if compatible types.
  if (incoming.phone) {
    const dup = existingLeads.findIndex(
      (l) =>
        l.phone &&
        l.phone === incoming.phone &&
        (l.status === 'NEW' || l.status === 'VIEWED' || l.status === 'IN_PROGRESS') &&
        withinDedupeWindow(l.lastSignalAt ?? l.createdAt, incoming.createdAt) &&
        compatibleTypes(l.type, incoming.type),
    );
    if (dup >= 0) {
      const next = [...existingLeads];
      const prev = next[dup];
      if (!prev) return { leads: existingLeads, merged: false, ignored: true };
      next[dup] = mergeTwo(prev, incoming);
      return { leads: next, merged: true, ignored: false };
    }
  }

  return { leads: [...existingLeads, incoming], merged: false, ignored: false };
}

function compatibleTypes(a: IncomingLeadType, b: IncomingLeadType): boolean {
  if (a === b) return true;
  // Call + Emergency from same phone within window = same person.
  const set = new Set([a, b]);
  if (set.has('CALL_CLICK') && set.has('EMERGENCY_ASSIST')) return true;
  if (set.has('CALL_CLICK') && set.has('CALLBACK_REQUEST')) return true;
  return false;
}

// -- expiry -----------------------------------------------------------------

export function isLeadExpired(lead: IncomingLead, now: number = Date.now()): boolean {
  if (lead.status === 'HANDLED' || lead.status === 'DISMISSED' || lead.status === 'EXPIRED') {
    return false;
  }
  const ts = Date.parse(lead.lastSignalAt ?? lead.createdAt);
  if (!Number.isFinite(ts)) return false;
  return now - ts > LEAD_EXPIRY_MS[lead.type];
}

// -- display copy -----------------------------------------------------------

export interface LeadDisplayCopy {
  title: string;
  subtitle: string;
  badge: string;
  primaryActionLabel: string;
}

export function getLeadDisplayCopy(lead: IncomingLead): LeadDisplayCopy {
  switch (lead.type) {
    case 'CALL_CLICK':
      return {
        title: 'New website call',
        subtitle: lead.phone
          ? `Phone: ${lead.phone}`
          : 'No phone yet — they may already be calling.',
        badge: 'Call',
        primaryActionLabel: 'Start Quick Booking',
      };
    case 'EMERGENCY_ASSIST': {
      const locationStatus = locationConfidenceLabel(lead.locationConfidence);
      return {
        title: 'Emergency assist started',
        subtitle: locationStatus,
        badge: 'Emergency',
        primaryActionLabel: 'Open Quick Booking',
      };
    }
    case 'CALLBACK_REQUEST':
      return {
        title: 'Callback request',
        subtitle: lead.phone ? `Phone: ${lead.phone}` : 'Customer is waiting for a call back.',
        badge: 'Callback',
        primaryActionLabel: 'Call customer',
      };
  }
}

function locationConfidenceLabel(conf: string | undefined): string {
  switch (conf) {
    case 'CONFIRMED_ADDRESS':
      return 'Address confirmed';
    case 'GPS_ONLY':
      return 'GPS-only location';
    case 'WEAK_ADDRESS':
      return 'Partial address';
    case 'MISSING_LOCATION':
      return 'No location yet';
    default:
      return 'Waiting for location';
  }
}

// -- status updaters --------------------------------------------------------

export function setLeadStatus(
  leads: IncomingLead[],
  id: string,
  status: IncomingLeadStatus,
): IncomingLead[] {
  return leads.map((l) =>
    l.id === id
      ? { ...l, status, updatedAt: nowIso() }
      : l,
  );
}
