import { z } from 'zod';

const phoneRegex = /^\+?[0-9 ()-]{6,20}$/;

export const trackingIdSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^TR-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/, 'Invalid tracking ID');
export type TrackingIdInput = z.infer<typeof trackingIdSchema>;

export const lockingWheelNutStatusSchema = z.enum([
  'HAVE_KEY',
  'NO_KEY',
  'STANDARD_ONLY',
]);

export const checkoutPaymentModeSchema = z.enum(['FULL', 'DEPOSIT']);

export const createCheckoutSessionSchema = z
  .object({
    quoteId: z.string().uuid(),
    customerName: z.string().trim().min(2).max(160),
    customerPhone: z.string().trim().regex(phoneRegex, 'Invalid phone'),
    customerEmail: z.string().trim().email().max(320),
    lockingWheelNutStatus: lockingWheelNutStatusSchema,
    checkoutPaymentMode: checkoutPaymentModeSchema.default('FULL'),
    customerAcceptedDepositTerms: z.boolean().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.checkoutPaymentMode === 'DEPOSIT' && !val.customerAcceptedDepositTerms) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customerAcceptedDepositTerms'],
        message: 'Deposit terms must be accepted to pay a deposit.',
      });
    }
  });
export type CreateCheckoutSessionInput = z.infer<typeof createCheckoutSessionSchema>;

export const stripeWebhookMetadataSchema = z.object({
  bookingId: z.string().uuid(),
  quoteId: z.string().uuid(),
  trackingId: z.string().regex(/^TR-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/),
  customerId: z.string().uuid(),
  tyreId: z.string().uuid(),
});
export type StripeWebhookMetadata = z.infer<typeof stripeWebhookMetadataSchema>;
