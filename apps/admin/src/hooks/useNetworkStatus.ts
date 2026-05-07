import { useEffect, useState } from 'react';
import { apiBaseUrl } from '@/lib/api/client';

/**
 * Item 10 — Offline mode detector.
 *
 * Lightweight, dependency-free network check that pings the API
 * `/api/health` (or root) every 15 seconds. We avoid adding NetInfo to
 * keep the Android bundle small and to keep the spec restriction "no new
 * heavy dependencies" satisfied.
 */
const BASE_URL = apiBaseUrl;
const PING_INTERVAL_MS = 15000;

export interface NetworkStatus {
  online: boolean;
  lastCheckedAt: number | null;
}

export function useNetworkStatus(): NetworkStatus {
  const [online, setOnline] = useState(true);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function ping(): Promise<void> {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 5000);
      try {
        const res = await fetch(`${BASE_URL}/api/health`, {
          method: 'GET',
          signal: ctrl.signal,
        });
        if (!cancelled) {
          setOnline(res.ok || res.status < 500);
          setLastCheckedAt(Date.now());
        }
      } catch {
        if (!cancelled) {
          setOnline(false);
          setLastCheckedAt(Date.now());
        }
      } finally {
        clearTimeout(t);
      }
    }

    void ping();
    timer = setInterval(() => {
      void ping();
    }, PING_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, []);

  return { online, lastCheckedAt };
}
