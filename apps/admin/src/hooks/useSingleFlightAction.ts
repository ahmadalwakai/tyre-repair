import { useCallback, useRef, useState } from 'react';

/**
 * Item 14 — single-flight hook.
 *
 * Wraps an async action so it can only run once at a time. Disables the
 * button until the action settles, prevents accidental double-taps, and
 * exposes pending / error state for UI feedback.
 */
export type SingleFlightStatus = 'idle' | 'pending' | 'success' | 'error';

export interface SingleFlightHandle<TArgs extends unknown[], TResult> {
  run: (...args: TArgs) => Promise<TResult | null>;
  status: SingleFlightStatus;
  isPending: boolean;
  error: string | null;
  reset: () => void;
}

export function useSingleFlightAction<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
): SingleFlightHandle<TArgs, TResult> {
  const [status, setStatus] = useState<SingleFlightStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const run = useCallback(
    async (...args: TArgs): Promise<TResult | null> => {
      if (inFlightRef.current) return null;
      inFlightRef.current = true;
      setStatus('pending');
      setError(null);
      try {
        const out = await action(...args);
        setStatus('success');
        return out;
      } catch (e) {
        setStatus('error');
        setError(e instanceof Error ? e.message : 'Action failed');
        return null;
      } finally {
        inFlightRef.current = false;
      }
    },
    [action],
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);

  return { run, status, isPending: status === 'pending', error, reset };
}
