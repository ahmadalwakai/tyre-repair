/**
 * Local draft persistence for the Quick Booking wizard.
 *
 * Saves a small, non-sensitive snapshot of the in-progress wizard state to
 * SecureStore so an admin who accidentally closes the app or navigates away
 * can recover within 30 minutes. We never persist Stripe secrets or auth tokens.
 */
import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'admin.quickBooking.draft.v1';
const TTL_MS = 30 * 60 * 1000;

export interface QuickBookingDraft {
  savedAt: number;
  source?: string;
  callClickEventId?: string;
  emergencyAssistEventId?: string;
  customerPhone?: string;
  customerName?: string;
  customerEmail?: string;
  locationLabel?: string;
  latitude?: number;
  longitude?: number;
  locationConfidence?: string;
  vehicleSafetyStatus?: string;
  vehicleRegistration?: string;
  jobType?: 'ASSESSMENT' | 'REPLACEMENT';
  tyreProblemType?: string;
  tyreSize?: string;
  selectedStockId?: string;
  lockingWheelNutStatus?: string;
  paymentMode?: 'CASH' | 'DEPOSIT' | 'FULL';
  balanceCollectionMethod?: string;
  internalNote?: string;
  step?: number;
}

export async function saveQuickBookingDraft(
  draft: Omit<QuickBookingDraft, 'savedAt'>,
): Promise<void> {
  try {
    const payload: QuickBookingDraft = { ...draft, savedAt: Date.now() };
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* best-effort */
  }
}

export async function loadQuickBookingDraft(): Promise<QuickBookingDraft | null> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuickBookingDraft;
    if (typeof parsed?.savedAt !== 'number') return null;
    if (Date.now() - parsed.savedAt > TTL_MS) {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function clearQuickBookingDraft(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
  } catch {
    /* */
  }
}
