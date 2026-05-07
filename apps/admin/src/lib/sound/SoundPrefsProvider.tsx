import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import {
  getUiFeedbackEnabled,
  setUiFeedbackEnabled as setRuntimeFlag,
} from '@/lib/sound/play-sound';

const STORAGE_KEY = 'admin.uiFeedbackEnabled';

interface SoundPrefsContextValue {
  uiFeedbackEnabled: boolean;
  setUiFeedbackEnabled: (enabled: boolean) => Promise<void>;
}

const SoundPrefsContext = createContext<SoundPrefsContextValue | null>(null);

/**
 * Loads & persists the "UI feedback sounds" preference. Critical
 * notification sounds (incoming call, emergency assist) are still
 * controlled by the existing notification preferences — this is only
 * for the in-app micro feedback (toasts, button confirmations).
 */
export function SoundPrefsProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [enabled, setEnabled] = useState<boolean>(getUiFeedbackEnabled());

  useEffect(() => {
    let cancelled = false;
    void SecureStore.getItemAsync(STORAGE_KEY)
      .then((raw) => {
        if (cancelled) return;
        if (raw === 'false') {
          setRuntimeFlag(false);
          setEnabled(false);
        } else {
          setRuntimeFlag(true);
          setEnabled(true);
        }
      })
      .catch(() => {
        // best-effort: keep default enabled
      });
    return (): void => {
      cancelled = true;
    };
  }, []);

  const update = useCallback(async (next: boolean): Promise<void> => {
    setRuntimeFlag(next);
    setEnabled(next);
    try {
      await SecureStore.setItemAsync(STORAGE_KEY, next ? 'true' : 'false');
    } catch {
      // best-effort
    }
  }, []);

  return (
    <SoundPrefsContext.Provider
      value={{ uiFeedbackEnabled: enabled, setUiFeedbackEnabled: update }}
    >
      {children}
    </SoundPrefsContext.Provider>
  );
}

export function useSoundPrefs(): SoundPrefsContextValue {
  const ctx = useContext(SoundPrefsContext);
  if (!ctx) throw new Error('useSoundPrefs must be used inside SoundPrefsProvider');
  return ctx;
}
