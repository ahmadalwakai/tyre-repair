import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { clearToken, getToken, setToken } from '@/lib/auth/session';
import { me as fetchMe } from '@/lib/api/auth';
import type { AdminProfile } from '@/types/auth';
import { disconnectPusher, refreshPusherAuthHeaders } from '@/lib/realtime/client';

interface SessionContextValue {
  isLoading: boolean;
  admin: AdminProfile | null;
  refresh: () => Promise<void>;
  signIn: (token: string, admin: AdminProfile) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [isLoading, setLoading] = useState(true);
  const [admin, setAdmin] = useState<AdminProfile | null>(null);

  const refresh = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setAdmin(null);
      setLoading(false);
      return;
    }
    try {
      const res = await fetchMe();
      setAdmin(res.admin);
      await refreshPusherAuthHeaders();
    } catch {
      await clearToken();
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signIn = useCallback(async (token: string, profile: AdminProfile) => {
    await setToken(token);
    await refreshPusherAuthHeaders();
    setAdmin(profile);
  }, []);

  const signOut = useCallback(async () => {
    await clearToken();
    disconnectPusher();
    setAdmin(null);
    try {
      router.replace('/login');
    } catch {
      // ignore
    }
  }, []);

  return (
    <SessionContext.Provider value={{ isLoading, admin, refresh, signIn, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
