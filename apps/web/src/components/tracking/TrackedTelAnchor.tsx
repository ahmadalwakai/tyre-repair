'use client';
import type { ReactNode } from 'react';
import { reportCallClick } from '@/lib/lead-events/call-click';

export interface TrackedTelAnchorProps {
  href: string;
  children: ReactNode;
  callTrackingSource?: string;
  ariaLabel?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Client-side anchor for tel: links that fires reportCallClick on tap.
 * Used by GoldButton (server component) so it does not need to declare
 * itself as a client component.
 */
export function TrackedTelAnchor({
  href,
  children,
  callTrackingSource,
  ariaLabel,
  className,
  style,
}: TrackedTelAnchorProps) {
  return (
    <a
      href={href}
      aria-label={ariaLabel}
      className={className}
      style={style}
      onClick={() => {
        try {
          reportCallClick({ sourceComponent: callTrackingSource ?? 'GoldButton' });
        } catch {
          // never block tel: link
        }
      }}
    >
      {children}
    </a>
  );
}
