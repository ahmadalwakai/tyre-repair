'use client';

import { usePathname } from 'next/navigation';
import { MobileEmergencyActionBar } from './MobileEmergencyActionBar';
import { ResumeQuoteNudge } from './ResumeQuoteNudge';
import { CallInsteadPrompt } from './CallInsteadPrompt';
import { classifyRoute, shouldOfferResumeQuote } from '@/lib/mobile-actions';

/**
 * Single mount point for the mobile UX pack.
 *
 * Rendered next to <FloatingActions /> on every public page that already
 * uses FloatingActions. Each child decides for itself whether it should
 * appear on the current route — this wrapper just provides the route hint
 * and avoids each piece duplicating `usePathname()`.
 */
export function MobileMount() {
  const pathname = usePathname();
  const ctx = classifyRoute(pathname);

  return (
    <>
      <MobileEmergencyActionBar />
      <ResumeQuoteNudge enabled={shouldOfferResumeQuote(ctx)} />
      <CallInsteadPrompt enabled={ctx === 'quote'} />
    </>
  );
}
