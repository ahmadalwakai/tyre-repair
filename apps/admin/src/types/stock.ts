export type StockAvailability = 'in_stock' | 'low_stock' | 'special_order';

export interface StockItem {
  stockId: string;
  tyreId: string;
  sku: string;
  brand: string;
  model: string;
  sizeLabel: string;
  tier: string;
  type: string;
  basePriceGbp: number;
  quantityAvailable: number;
  lowStockThreshold: number;
  reservedQuantity: number;
  locationName: string;
  availability: StockAvailability;
  fastFitAvailable: boolean;
  updatedAt: string;
}

export interface StockListResponse {
  items: StockItem[];
  nextCursor: string | null;
}
