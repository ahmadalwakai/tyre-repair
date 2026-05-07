export interface DashboardSummary {
  today: { revenueGbp: string; bookings: number; payments: number };
  week: { revenueGbp: string; bookings: number; payments: number };
  bookings: { open: number; completed: number; cancelled: number };
  pricing: { activeOverrides: number };
  topTyres: Array<{
    tyreId: string;
    sku: string;
    brand: string;
    model: string;
    sizeLabel: string;
    tier: string;
    bookings: number;
  }>;
  generatedAt: string;
}
