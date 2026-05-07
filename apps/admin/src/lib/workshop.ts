/**
 * Workshop origin used for emergency assist distance / directions panels.
 *
 * Values are taken from EXPO_PUBLIC_WORKSHOP_* env vars (see apps/admin/.env)
 * and frozen at bundle time. Restart Metro with --clear after editing.
 */

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const WORKSHOP = {
  latitude: num(process.env['EXPO_PUBLIC_WORKSHOP_LAT'], 55.8585),
  longitude: num(process.env['EXPO_PUBLIC_WORKSHOP_LNG'], -4.2155),
  address:
    process.env['EXPO_PUBLIC_WORKSHOP_ADDRESS'] ??
    'Unit 1, 10 Gateside Street, Glasgow G31 1PD',
  postcode: process.env['EXPO_PUBLIC_WORKSHOP_POSTCODE'] ?? 'G31 1PD',
} as const;
