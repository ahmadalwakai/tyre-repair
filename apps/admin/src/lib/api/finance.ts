import { apiGet } from './client';

export interface OutstandingBalanceItem {
  bookingId: string;
  trackingId: string;
  status: string;
  paymentStatus: string;
  jobType: string;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  depositAmountGbp: string;
  balanceDueGbp: string;
  depositPaidAt: string | null;
  createdAt: string;
}

export interface OutstandingBalancesResponse {
  items: OutstandingBalanceItem[];
  totals: { count: number; totalOutstandingGbp: string };
}

export interface FailedPaymentItem {
  paymentId: string;
  bookingId: string | null;
  trackingId: string | null;
  kind: string;
  amountGbp: string;
  failedAt: string | null;
  createdAt: string;
  stripePaymentIntentId: string;
  bookingStatus: string | null;
  bookingPaymentStatus: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
}

export interface FailedPaymentsResponse {
  items: FailedPaymentItem[];
  totals: { count: number };
}

export interface DailyClosePayment {
  id: string;
  bookingId: string | null;
  trackingId: string | null;
  customerName: string | null;
  kind: string;
  amountGbp: string;
  paidAt: string;
}

export interface DailyCloseResponse {
  date: string;
  cash: {
    collectedTotalGbp: string;
    collectedFullGbp: string;
    collectedDepositGbp: string;
    collectedBalanceGbp: string;
    collectedAdjustmentGbp: string;
    paymentsCount: number;
    failedCount: number;
  };
  operations: {
    completedToday: number;
    cancelledToday: number;
    depositRetainedTotalGbp: string;
    depositRetainedCount: number;
  };
  payments: DailyClosePayment[];
}

export async function getOutstandingBalances(): Promise<OutstandingBalancesResponse> {
  return apiGet<OutstandingBalancesResponse>('/api/admin/finance/outstanding-balances');
}

export async function getFailedPayments(): Promise<FailedPaymentsResponse> {
  return apiGet<FailedPaymentsResponse>('/api/admin/finance/failed-payments');
}

export async function getDailyClose(date?: string): Promise<DailyCloseResponse> {
  const qs = date ? `?date=${encodeURIComponent(date)}` : '';
  return apiGet<DailyCloseResponse>(`/api/admin/finance/daily-close${qs}`);
}
