import { apiGet, apiPatch, apiPost } from './client';
import type { StockListResponse } from '@/types/stock';

export function listStock(query?: { search?: string; availability?: string; limit?: number }): Promise<StockListResponse> {
  const params = new URLSearchParams();
  if (query?.search) params.set('search', query.search);
  if (query?.availability) params.set('availability', query.availability);
  if (typeof query?.limit === 'number') params.set('limit', String(query.limit));
  const qs = params.toString();
  return apiGet<StockListResponse>(`/api/admin/stock${qs ? `?${qs}` : ''}`);
}

export function patchStock(
  stockId: string,
  body: { quantityAvailable?: number; lowStockThreshold?: number; reservedQuantity?: number },
): Promise<{
  success: boolean;
  stockId: string;
  quantityAvailable: number;
  lowStockThreshold: number;
  reservedQuantity: number;
}> {
  return apiPatch(`/api/admin/stock/${stockId}`, body);
}

export function importStockCsv(csvText: string): Promise<{
  updated: number;
  skipped: number;
  results: Array<{ rowNumber: number; sku: string; ok: boolean; message?: string }>;
}> {
  return apiPost('/api/admin/stock/import', { csvText });
}
