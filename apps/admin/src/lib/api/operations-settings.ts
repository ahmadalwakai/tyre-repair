import { apiGet, apiPatch } from './client';
import type { OperationalSettings } from '@/types/operations-settings';

export async function getOperationalSettings(): Promise<{ settings: OperationalSettings }> {
  return apiGet<{ settings: OperationalSettings }>('/api/admin/settings/operations');
}

export async function updateOperationalSettings(
  patch: Partial<OperationalSettings>,
): Promise<{ settings: OperationalSettings }> {
  return apiPatch<{ settings: OperationalSettings }>('/api/admin/settings/operations', patch);
}
