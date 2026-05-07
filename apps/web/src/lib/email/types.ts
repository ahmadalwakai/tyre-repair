export interface BookingConfirmationEmailInput {
  to: string;
  customerName: string;
  trackingId: string;
  trackingUrl: string;
  tyreLabel: string;
  totalPaidGbp: string;
  isSpecialOrder: boolean;
  lockingWheelNutStatus?: 'HAVE_KEY' | 'NO_KEY' | 'STANDARD_ONLY';
  /** ASSESSMENT triage callouts swap copy and price label. */
  jobType?: 'ASSESSMENT' | 'REPLACEMENT';
  tyreProblemType?:
    | 'PUNCTURE_OR_FLAT'
    | 'DAMAGED_OR_BLOWN_OUT'
    | 'SLOW_PRESSURE_LOSS'
    | 'NEEDS_REPLACEMENT'
    | 'NOT_SURE'
    | null;
  assessmentFeeGbp?: string | null;
  backupTyreLabel?: string | null;
  /** When 'DEPOSIT', email shows 15% dispatch deposit copy and balance-due. */
  paymentMode?: 'FULL' | 'DEPOSIT';
  depositAmountGbp?: string | null;
  balanceDueGbp?: string | null;
  totalPriceGbp?: string | null;
  cancellationPolicyUrl?: string | null;
}

export interface BookingConfirmationEmailResult {
  sent: boolean;
  skippedReason?: 'no_api_key' | 'no_from' | 'no_to' | 'send_failed';
  providerMessageId?: string;
}
