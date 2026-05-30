import { apiGet, apiPatch } from './client';
import type { SeoPageAdminRow, SeoPageWritePatch } from '@/types/seo-pages';

export async function listSeoPages(): Promise<{ pages: SeoPageAdminRow[] }> {
  return apiGet<{ pages: SeoPageAdminRow[] }>('/api/admin/seo-pages');
}

export async function updateSeoPage(
  path: string,
  patch: SeoPageWritePatch,
): Promise<{ page: SeoPageAdminRow }> {
  return apiPatch<{ page: SeoPageAdminRow }>(
    `/api/admin/seo-pages/${encodeURIComponent(path)}`,
    patch,
  );
}

export async function resetSeoPage(path: string): Promise<{ page: SeoPageAdminRow }> {
  return apiPatch<{ page: SeoPageAdminRow }>(
    `/api/admin/seo-pages/${encodeURIComponent(path)}`,
    { reset: true },
  );
}
