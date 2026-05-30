import { apiDelete, apiGet, apiPatch, apiPost } from './client';
import type { CoverageZone, CoverageZoneWriteInput } from '@/types/coverage-zones';

export async function listCoverageZones(): Promise<{ zones: CoverageZone[] }> {
  return apiGet<{ zones: CoverageZone[] }>('/api/admin/coverage-zones');
}

export async function createCoverageZone(
  input: CoverageZoneWriteInput,
): Promise<{ zone: CoverageZone }> {
  return apiPost<{ zone: CoverageZone }>('/api/admin/coverage-zones', input);
}

export async function updateCoverageZone(
  zoneId: string,
  patch: Partial<CoverageZoneWriteInput>,
): Promise<{ zone: CoverageZone }> {
  return apiPatch<{ zone: CoverageZone }>(`/api/admin/coverage-zones/${zoneId}`, patch);
}

export async function deleteCoverageZone(zoneId: string): Promise<{ ok: true }> {
  return apiDelete<{ ok: true }>(`/api/admin/coverage-zones/${zoneId}`);
}
