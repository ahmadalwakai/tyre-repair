export type StripeBookingMetadataValue = string;

export interface StripeBookingMetadata {
  bookingId: StripeBookingMetadataValue;
  quoteId: StripeBookingMetadataValue;
  trackingId: StripeBookingMetadataValue;
  customerId: StripeBookingMetadataValue;
  tyreId: StripeBookingMetadataValue;
  jobType?: StripeBookingMetadataValue;
  bookingAdjustmentId?: StripeBookingMetadataValue;
  /** 'full' | 'deposit' | 'balance' | 'adjustment' — used by webhook to route handling. */
  paymentKind?: StripeBookingMetadataValue;
}

export interface CreateBookingPaymentIntentInput {
  amountPence: number;
  currency: 'gbp';
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  metadata: StripeBookingMetadata;
  description: string;
  receiptEmail?: string;
}

export interface CreateBookingPaymentIntentResult {
  paymentIntentId: string;
  clientSecret: string;
  amountPence: number;
  currency: 'gbp';
}
