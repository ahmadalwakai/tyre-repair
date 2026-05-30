/**
 * Admin-editable booking-window + pricing extras exposed by
 * `/api/admin/settings/tyre-shop-booking`.
 *
 * Each field replaces a value that used to be hard-coded on the website:
 *   - slotTimes            : Buy-Tyres slot grid (was 09:00,11:00,13:00,15:00)
 *   - bookingWindowDays    : how far ahead the public can book (was 14)
 *   - sundaysOpen          : whether Sunday slots appear (was always false)
 *   - quoteExpiryMinutes   : quote validity window (was 30)
 *   - minimumDepositGbp    : deposit floor on DEPOSIT mode (was £10)
 */
export interface TyreShopBookingExtras {
  slotTimes: string[];
  bookingWindowDays: number;
  sundaysOpen: boolean;
  quoteExpiryMinutes: number;
  minimumDepositGbp: number;
  /** Peak morning band start hour (London, 0–23). */
  peakMorningStartHour: number;
  /** Peak morning band end hour (London, 0–23, exclusive). */
  peakMorningEndHour: number;
  /** Night band start hour (London, 0–23). */
  nightStartHour: number;
  /** Night band end hour (London, 0–23, exclusive). Wraps past midnight. */
  nightEndHour: number;
}
