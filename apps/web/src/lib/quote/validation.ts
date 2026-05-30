import { z } from 'zod';

export const UK_REG_REGEX = /^[A-Z0-9]{1,8}$/;

export const vehicleLookupSchema = z.object({
  registration: z
    .string()
    .min(1, 'Registration is required')
    .max(16, 'Registration is too long')
    .transform((v) => v.replace(/\s+/g, '').toUpperCase())
    .refine((v) => UK_REG_REGEX.test(v), 'Enter a valid registration'),
});
export type VehicleLookupBody = z.infer<typeof vehicleLookupSchema>;

const tyreTierEnum = z.enum(['budget', 'mid_range', 'premium']);
const tyreTypeEnum = z.enum(['summer', 'winter', 'all_season', 'run_flat', 'commercial']);

export const tyreSearchSchema = z.object({
  sizeLabel: z
    .string()
    .max(32)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  tier: tyreTierEnum.optional(),
  type: tyreTypeEnum.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(30),
});
export type TyreSearchQuery = z.infer<typeof tyreSearchSchema>;

const phoneRegex = /^\+?[0-9 ()-]{6,20}$/;
const emailSchema = z.string().email().max(320);

export const locationSendLinkSchema = z
  .object({
    method: z.enum(['sms', 'email']),
    phone: z.string().regex(phoneRegex).optional(),
    email: emailSchema.optional(),
  })
  .refine(
    (v) => (v.method === 'sms' ? Boolean(v.phone) : Boolean(v.email)),
    { message: 'Provide phone for SMS or email for email' },
  );
export type LocationSendLinkBody = z.infer<typeof locationSendLinkSchema>;

export const locationResolveSchema = z.object({
  token: z.string().min(10).max(2048),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMeters: z.number().min(0).max(1_000_000).optional(),
});
export type LocationResolveBody = z.infer<typeof locationResolveSchema>;

export const manualAddressSchema = z.object({
  addressLine1: z.string().min(2).max(240),
  addressLine2: z.string().max(240).optional(),
  city: z.string().min(2).max(120),
  postcode: z.string().min(3).max(20),
  country: z.string().max(80).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const tyreProblemTypeSchema = z.enum([
  'PUNCTURE_OR_FLAT',
  'DAMAGED_OR_BLOWN_OUT',
  'SLOW_PRESSURE_LOSS',
  'NEEDS_REPLACEMENT',
  'NOT_SURE',
]);
export const quoteJobTypeSchema = z.enum(['ASSESSMENT', 'REPLACEMENT']);
export const lockingWheelNutStatusSchema = z.enum([
  'HAVE_KEY',
  'NO_KEY',
  'STANDARD_ONLY',
]);

export const quoteCreateSchema = z
  .object({
    vehicleRegistration: z.string().max(16).optional(),
    vehicleMake: z.string().max(80).optional(),
    vehicleModel: z.string().max(120).optional(),
    vehicleYear: z.number().int().min(1900).max(2100).optional(),
    jobType: quoteJobTypeSchema.optional().default('REPLACEMENT'),
    tyreProblemType: tyreProblemTypeSchema.optional(),
    tyreId: z.string().uuid('Invalid tyreId').optional(),
    backupTyreId: z.string().uuid().optional(),
    locationId: z.string().uuid().optional(),
    manualLocation: manualAddressSchema.optional(),
    customerPhone: z.string().regex(phoneRegex).optional(),
    customerEmail: emailSchema.optional(),
    customerName: z.string().min(1).max(160).optional(),
    /** Customer's answer to the locking-wheel-nut question from the tyre
     * step. Persisted alongside the quote (in pricingBreakdown JSON) so
     * checkout can pre-fill without leaking the value through the URL. */
    lockingWheelNutStatus: lockingWheelNutStatusSchema.optional(),
  })
  .superRefine((v, ctx) => {
    if (v.jobType === 'REPLACEMENT' && !v.tyreId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tyreId'],
        message: 'tyreId is required when jobType is REPLACEMENT',
      });
    }
  });
export type QuoteCreateBody = z.infer<typeof quoteCreateSchema>;
