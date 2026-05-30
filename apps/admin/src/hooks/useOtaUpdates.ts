import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as Updates from 'expo-updates';

export type OtaStatus =
  | 'idle'
  | 'checking'
  | 'downloading'
  | 'ready-to-reload'
  | 'up-to-date'
  | 'error';

interface State {
  status: OtaStatus;
  error: string | null;
}

/**
 * OTA updates hook (expo-updates).
 *
 * - Auto-checks on mount and whenever the app returns to foreground.
 * - Exposes `status` + a `reload()` action so the caller can render a small
 *   "Update ready — tap to install" banner.
 * - No-ops in development (`Updates.isEnabled === false`) so it's safe to
 *   keep mounted under Expo Go / dev-client.
 */
export function useOtaUpdates(): {
  status: OtaStatus;
  error: string | null;
  check: () => Promise<void>;
  reload: () => Promise<void>;
} {
  const [state, setState] = useState<State>({ status: 'idle', error: null });
  const checking = useRef(false);

  const check = useCallback(async (): Promise<void> => {
    if (!Updates.isEnabled || checking.current) return;
    checking.current = true;
    try {
      setState({ status: 'checking', error: null });
      const res = await Updates.checkForUpdateAsync();
      if (!res.isAvailable) {
        setState({ status: 'up-to-date', error: null });
        return;
      }
      setState({ status: 'downloading', error: null });
      const fetched = await Updates.fetchUpdateAsync();
      if (fetched.isNew) {
        setState({ status: 'ready-to-reload', error: null });
      } else {
        setState({ status: 'up-to-date', error: null });
      }
    } catch (err) {
      setState({
        status: 'error',
        error: err instanceof Error ? err.message : 'Update check failed',
      });
    } finally {
      checking.current = false;
    }
  }, []);

  const reload = useCallback(async (): Promise<void> => {
    try {
      await Updates.reloadAsync();
    } catch (err) {
      setState({
        status: 'error',
        error: err instanceof Error ? err.message : 'Reload failed',
      });
    }
  }, []);

  useEffect(() => {
    void check();
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      if (s === 'active') void check();
    });
    return () => sub.remove();
  }, [check]);

  return { status: state.status, error: state.error, check, reload };
}
