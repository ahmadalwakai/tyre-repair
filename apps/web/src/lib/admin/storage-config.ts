/**
 * Admin Stability & Field Operations Pack — Part 3
 * Storage provider configuration check.
 *
 * No object storage client is currently bundled in the web app. This helper
 * tells callers whether the env declares a storage provider so we can:
 *  - Return a clean "not configured" 503 from upload endpoints rather than
 *    crashing or faking uploads.
 *  - Show a calm "Photo upload is not configured" message in the admin app.
 *
 * Recommended env contract (any provider):
 *   STORAGE_PROVIDER         = 's3' | 'r2' | 'vercel_blob' | 'none'
 *   STORAGE_BUCKET           = bucket name (s3/r2)
 *   STORAGE_ACCESS_KEY_ID    = (s3/r2)
 *   STORAGE_SECRET_ACCESS_KEY= (s3/r2)
 *   STORAGE_PUBLIC_BASE_URL  = public URL prefix for uploaded objects
 */

export type StorageProvider = 's3' | 'r2' | 'vercel_blob' | 'none';

export interface StorageConfigStatus {
  configured: boolean;
  provider: StorageProvider;
  publicBaseUrlPresent: boolean;
  missing: string[];
}

export function getStorageConfigStatus(): StorageConfigStatus {
  const raw = (process.env['STORAGE_PROVIDER'] ?? 'none').toLowerCase();
  const provider: StorageProvider =
    raw === 's3' || raw === 'r2' || raw === 'vercel_blob' ? raw : 'none';
  const publicBaseUrlPresent = Boolean(process.env['STORAGE_PUBLIC_BASE_URL']);
  const missing: string[] = [];

  if (provider === 'none') {
    missing.push('STORAGE_PROVIDER');
  }
  if (provider === 's3' || provider === 'r2') {
    if (!process.env['STORAGE_BUCKET']) missing.push('STORAGE_BUCKET');
    if (!process.env['STORAGE_ACCESS_KEY_ID']) missing.push('STORAGE_ACCESS_KEY_ID');
    if (!process.env['STORAGE_SECRET_ACCESS_KEY']) missing.push('STORAGE_SECRET_ACCESS_KEY');
    if (!publicBaseUrlPresent) missing.push('STORAGE_PUBLIC_BASE_URL');
  }
  if (provider === 'vercel_blob') {
    if (!process.env['BLOB_READ_WRITE_TOKEN']) missing.push('BLOB_READ_WRITE_TOKEN');
  }

  return {
    configured: provider !== 'none' && missing.length === 0,
    provider,
    publicBaseUrlPresent,
    missing,
  };
}
