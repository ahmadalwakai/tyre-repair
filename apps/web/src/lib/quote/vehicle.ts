/** Vehicle helpers shared between client and server. */

export function normalizeRegistration(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase();
}

export function formatRegistrationDisplay(raw: string): string {
  const v = normalizeRegistration(raw);
  if (v.length >= 5) return `${v.slice(0, v.length - 3)} ${v.slice(-3)}`;
  return v;
}
