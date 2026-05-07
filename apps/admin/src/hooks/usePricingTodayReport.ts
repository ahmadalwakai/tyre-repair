import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { getPricingTodayReport } from '@/lib/api/reports';
import { ApiError } from '@/lib/api/client';
import type { PricingTodayReport } from '@/types/reports';

const STALE_MS = 60_000;

export interface UsePricingTodayReportResult {
  data: PricingTodayReport | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refetch: (opts?: { fresh?: boolean }) => Promise<void>;
}

/**
 * Fetches the daily pricing snapshot, with:
 *  - request abort on unmount,
 *  - 60s stale window (in-memory) to avoid hammering on screen toggles,
 *  - automatic refetch when the app returns to foreground if stale.
 */
export function usePricingTodayReport(): UsePricingTodayReportResult {
  const [data, setData] = useState<PricingTodayReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastLoadedAtRef = useRef<number>(0);

  const refetch = useCallback(async (opts?: { fresh?: boolean }): Promise<void> => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setError(null);
    if (data) setRefreshing(true);
    try {
      const res = await getPricingTodayReport({
        ...(opts?.fresh ? { fresh: true } : {}),
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        setData(res);
        lastLoadedAtRef.current = Date.now();
      }
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof ApiError ? e.message : 'Could not load pricing snapshot');
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [data]);

  useEffect(() => {
    void refetch();
    return () => {
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') {
        const stale = Date.now() - lastLoadedAtRef.current > STALE_MS;
        if (stale) void refetch();
      }
    });
    return () => sub.remove();
  }, [refetch]);

  return { data, loading, refreshing, error, refetch };
}
