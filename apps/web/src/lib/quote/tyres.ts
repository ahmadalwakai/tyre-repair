import type { TyreAvailability } from '@/types/quote';

export const SPECIAL_ORDER_COPY = 'Special order — fitted within 3 working days';

export function availabilityFromQuantity(
  quantityAvailable: number,
  lowStockThreshold = 2,
): TyreAvailability {
  if (quantityAvailable <= 0) return 'special_order';
  if (quantityAvailable <= lowStockThreshold) return 'low_stock';
  return 'in_stock';
}

export function availabilityLabel(availability: TyreAvailability): string {
  switch (availability) {
    case 'in_stock':
      return 'In stock';
    case 'low_stock':
      return 'Low stock';
    case 'special_order':
      return SPECIAL_ORDER_COPY;
  }
}

export const COMMON_TYRE_SIZES: readonly string[] = [
  '175/65R14',
  '185/65R15',
  '195/55R16',
  '195/65R15',
  '205/55R16',
  '215/55R17',
  '225/45R17',
  '225/40R18',
  '235/55R18',
  '255/35R19',
];
