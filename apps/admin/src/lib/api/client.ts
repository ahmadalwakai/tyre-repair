import { Platform } from 'react-native';
import { router } from 'expo-router';
import { clearToken, getToken } from '@/lib/auth/session';

function resolveBaseUrl(): string {
  // On web, the admin app is loaded in a browser on the same machine as the
  // dev tunnel. The LAN IP used for native devices is not reachable from the
  // browser here, so prefer the page's own origin (swap port to API port).
  // On native (Android emulator / physical device) keep the env var so the
  // device can reach the dev API across the LAN.
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const apiPort = process.env.EXPO_PUBLIC_API_PORT ?? '3000';
    return `${window.location.protocol}//${window.location.hostname}:${apiPort}`;
  }
  return process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';
}

const BASE_URL = resolveBaseUrl();

export class ApiError extends Error {
  public readonly status: number;
  public readonly body: unknown;
  public constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

interface RequestOptions {
  signal?: AbortSignal;
  skipAuthRedirect?: boolean;
  headers?: Record<string, string>;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts?: RequestOptions,
): Promise<T> {
  const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(opts?.headers ?? {}),
  };
  const token = await getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const init: RequestInit = { method, headers };
  if (body !== undefined) init.body = JSON.stringify(body);
  if (opts?.signal) init.signal = opts.signal;

  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e) {
    throw new ApiError(e instanceof Error ? e.message : 'Network error', 0, null);
  }

  let parsed: unknown = null;
  const text = await res.text();
  if (text.length > 0) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    if (res.status === 401 && !opts?.skipAuthRedirect) {
      try {
        await clearToken();
      } catch {
        // ignore
      }
      try {
        router.replace('/login');
      } catch {
        // router may not be ready yet
      }
    }
    const message =
      parsed && typeof parsed === 'object' && 'error' in parsed && typeof (parsed as { error: unknown }).error === 'string'
        ? (parsed as { error: string }).error
        : `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status, parsed);
  }
  return parsed as T;
}

export function apiGet<T>(path: string, opts?: RequestOptions): Promise<T> {
  return request<T>('GET', path, undefined, opts);
}
export function apiPost<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
  return request<T>('POST', path, body, opts);
}
export function apiPatch<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
  return request<T>('PATCH', path, body, opts);
}
export function apiDelete<T>(path: string, opts?: RequestOptions): Promise<T> {
  return request<T>('DELETE', path, undefined, opts);
}

export const apiBaseUrl = BASE_URL;
