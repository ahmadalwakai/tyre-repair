import { apiGet, apiPatch } from './client';
import type { TyreShopBookingExtras } from '@/types/tyre-shop-booking';

export async function getTyreShopBookingExtras(): Promise<{
  settings: TyreShopBookingExtras;
}> {
  return apiGet<{ settings: TyreShopBookingExtras }>(
    '/api/admin/settings/tyre-shop-booking',
  );
}

export async function updateTyreShopBookingExtras(
  patch: Partial<TyreShopBookingExtras>,
): Promise<{ settings: TyreShopBookingExtras }> {
  return apiPatch<{ settings: TyreShopBookingExtras }>(
    '/api/admin/settings/tyre-shop-booking',
    patch,
  );
}
