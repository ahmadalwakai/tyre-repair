/**
 * Admin Stability & Field Operations Pack — Part 3
 * Admin app — booking attachments API client.
 */
import { Platform } from 'react-native';
import { apiDelete, apiGet, apiPost, apiBaseUrl } from './client';
import { getToken } from '@/lib/auth/session';

export interface BookingAttachmentRecord {
  id: string;
  bookingId: string;
  uploadedByAdminId: string | null;
  type:
    | 'DAMAGE_PHOTO'
    | 'TYRE_SIZE_PHOTO'
    | 'LOCKING_NUT_PHOTO'
    | 'AFTER_REPAIR_PHOTO'
    | 'RECEIPT_PHOTO'
    | 'OTHER';
  fileUrl: string;
  fileKey: string | null;
  mimeType: string;
  sizeBytes: number;
  caption: string | null;
  createdAt: string;
}

export interface ListBookingAttachmentsResponse {
  bookingId: string;
  canUpload: boolean;
  canDelete: boolean;
  storage: {
    configured: boolean;
    provider: string;
    missing: string[];
  };
  items: BookingAttachmentRecord[];
}

export async function listBookingAttachments(
  bookingId: string,
  signal?: AbortSignal,
): Promise<ListBookingAttachmentsResponse> {
  return apiGet<ListBookingAttachmentsResponse>(
    `/api/admin/bookings/${encodeURIComponent(bookingId)}/attachments`,
    signal ? { signal } : undefined,
  );
}

export interface RecordBookingAttachmentInput {
  type: BookingAttachmentRecord['type'];
  fileUrl: string;
  fileKey?: string;
  mimeType: string;
  sizeBytes: number;
  caption?: string;
}

export async function recordBookingAttachment(
  bookingId: string,
  input: RecordBookingAttachmentInput,
): Promise<{ item: BookingAttachmentRecord }> {
  return apiPost<{ item: BookingAttachmentRecord }>(
    `/api/admin/bookings/${encodeURIComponent(bookingId)}/attachments`,
    input,
  );
}

export async function deleteBookingAttachment(
  bookingId: string,
  attachmentId: string,
): Promise<void> {
  await apiDelete<{ ok: true }>(
    `/api/admin/bookings/${encodeURIComponent(bookingId)}/attachments/${encodeURIComponent(attachmentId)}`,
  );
}

export interface UploadBookingAttachmentInput {
  uri: string;
  type: BookingAttachmentRecord['type'];
  mimeType: string;
  fileName?: string;
  caption?: string;
}

/**
 * Multipart upload of a captured photo to the web app, which forwards it to
 * the configured storage provider (vercel_blob). On non-vercel_blob
 * providers the server returns 501 — callers should fall back to capturing
 * metadata via `recordBookingAttachment` after uploading externally.
 */
export async function uploadBookingAttachment(
  bookingId: string,
  input: UploadBookingAttachmentInput,
): Promise<{ item: BookingAttachmentRecord }> {
  const url = `${apiBaseUrl}/api/admin/bookings/${encodeURIComponent(
    bookingId,
  )}/attachments/upload`;

  const form = new FormData();
  const filename =
    input.fileName ?? `photo-${Date.now()}.${input.mimeType.split('/')[1] ?? 'jpg'}`;

  if (Platform.OS === 'web') {
    const res = await fetch(input.uri);
    const blob = await res.blob();
    form.append('file', blob, filename);
  } else {
    // React Native FormData accepts { uri, name, type } file descriptors.
    form.append('file', {
      uri: input.uri,
      name: filename,
      type: input.mimeType,
    } as unknown as Blob);
  }
  form.append('type', input.type);
  if (input.caption) form.append('caption', input.caption);

  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = await getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { method: 'POST', headers, body: form });
  const text = await res.text();
  let parsed: unknown = null;
  if (text.length > 0) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }
  if (!res.ok) {
    const message =
      parsed && typeof parsed === 'object' && 'error' in parsed && typeof (parsed as { error: unknown }).error === 'string'
        ? (parsed as { error: string }).error
        : `Upload failed with status ${res.status}`;
    const code =
      parsed && typeof parsed === 'object' && 'code' in parsed
        ? String((parsed as { code: unknown }).code)
        : undefined;
    const err = new Error(message) as Error & { status?: number; code?: string };
    err.status = res.status;
    if (code) err.code = code;
    throw err;
  }
  return parsed as { item: BookingAttachmentRecord };
}
