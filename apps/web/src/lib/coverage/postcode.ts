import { z } from 'zod';

/**
 * UK postcode utilities.
 *
 * `normalizeUkPostcode` produces a single canonical form, e.g.:
 *   "g11aa"      -> "G1 1AA"
 *   " EH10 4BR " -> "EH10 4BR"
 *   "G1"         -> "G1"           (outward only — still valid for matching)
 *
 * Format reference: Royal Mail PAF — outward + space + inward (sector + unit).
 * Outward is 1–2 letters, 1 digit, optional letter/digit.
 * Inward (when present) is 1 digit + 2 letters.
 */

const FULL_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/;
const OUTWARD_ONLY = /^[A-Z]{1,2}\d[A-Z\d]?$/;

export function normalizeUkPostcode(raw: string): string | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.replace(/\s+/g, '').toUpperCase();
  if (!cleaned) return null;
  if (OUTWARD_ONLY.test(cleaned)) return cleaned;
  // Full postcode: insert single space before the final 3 chars.
  if (cleaned.length >= 5 && cleaned.length <= 7) {
    const outward = cleaned.slice(0, cleaned.length - 3);
    const inward = cleaned.slice(-3);
    const candidate = `${outward} ${inward}`;
    if (FULL_POSTCODE.test(candidate)) return candidate;
  }
  return null;
}

export function extractOutwardCode(normalizedPostcode: string): string | null {
  const [outward] = normalizedPostcode.split(' ');
  if (!outward) return null;
  return OUTWARD_ONLY.test(outward) ? outward : null;
}

/** Letters-only area part of the outward code (e.g. "G", "EH", "AB"). */
export function extractAreaCode(outwardCode: string): string | null {
  const m = outwardCode.match(/^([A-Z]{1,2})/);
  return m?.[1] ?? null;
}

/**
 * Zod schema for the public API payload. Accepts loose user input and
 * normalises in a `.transform` so callers always receive a clean value.
 */
export const postcodeInputSchema = z
  .string({ required_error: 'Enter your postcode.' })
  .trim()
  .min(2, 'Enter a valid UK postcode.')
  .max(16, 'Enter a valid UK postcode.')
  .transform((raw, ctx) => {
    const normalized = normalizeUkPostcode(raw);
    if (!normalized) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter a valid UK postcode.',
      });
      return z.NEVER;
    }
    return normalized;
  });

export const postcodeAvailabilityRequestSchema = z.object({
  postcode: postcodeInputSchema,
  intent: z.string().trim().max(64).optional(),
  source: z.string().trim().max(64).optional(),
});

export type PostcodeAvailabilityRequestParsed = z.infer<
  typeof postcodeAvailabilityRequestSchema
>;
