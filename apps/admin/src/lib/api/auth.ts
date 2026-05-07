import { apiPost, apiGet } from './client';
import type { LoginResponse, MeResponse } from '@/types/auth';

export function login(email: string, password: string): Promise<LoginResponse> {
  return apiPost<LoginResponse>('/api/admin/auth/login', { email, password }, { skipAuthRedirect: true });
}

export function me(): Promise<MeResponse> {
  return apiGet<MeResponse>('/api/admin/auth/me', { skipAuthRedirect: true });
}

export function logout(): Promise<{ success: boolean }> {
  return apiPost<{ success: boolean }>('/api/admin/auth/logout', {}, { skipAuthRedirect: true });
}

export function forgotPassword(email: string): Promise<{ message: string }> {
  return apiPost<{ message: string }>('/api/admin/auth/forgot-password', { email }, { skipAuthRedirect: true });
}

export function resetPassword(token: string, newPassword: string): Promise<{ success: boolean }> {
  return apiPost<{ success: boolean }>(
    '/api/admin/auth/reset-password',
    { token, newPassword },
    { skipAuthRedirect: true },
  );
}
