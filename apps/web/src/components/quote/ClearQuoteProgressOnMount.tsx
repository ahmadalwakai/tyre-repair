'use client';
import { useEffect } from 'react';
import { clearQuoteProgress } from '@/lib/quote/progress-storage';

/**
 * Mount-only side effect: clears the auto-saved quote progress now that the
 * customer has reached the success page. Renders nothing.
 */
export function ClearQuoteProgressOnMount(): null {
  useEffect(() => {
    clearQuoteProgress();
  }, []);
  return null;
}
