/**
 * Centralised TanStack Query key factory.
 *
 * Keep all query keys here so we can invalidate consistently from mutation
 * onSettled handlers and from realtime push handlers. Hierarchical structure
 * (`['bookings']` invalidates every booking query).
 */
export const qk = {
  dashboard: () => ['dashboard'] as const,
  actionQueue: () => ['action-queue'] as const,
  bookings: () => ['bookings'] as const,
  bookingsList: (params: unknown) => ['bookings', 'list', params] as const,
  booking: (id: string) => ['bookings', 'detail', id] as const,
  callbacks: () => ['callbacks'] as const,
  notifications: () => ['notifications'] as const,
  failedPayments: () => ['failed-payments'] as const,
  outstandingBalances: () => ['outstanding-balances'] as const,
  today: () => ['today'] as const,
  visitors: () => ['visitors'] as const,
  stock: () => ['stock'] as const,
  pricing: () => ['pricing'] as const,
  finance: () => ['finance'] as const,
} as const;
