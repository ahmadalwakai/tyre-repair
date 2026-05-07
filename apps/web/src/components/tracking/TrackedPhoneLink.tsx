'use client';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { reportCallClick, type CallClickEventInput } from '@/lib/lead-events/call-click';

export interface TrackedPhoneLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: string;
  sourceComponent: string;
  trackingMeta?: Omit<CallClickEventInput, 'sourceComponent'>;
  children: ReactNode;
}

/**
 * Wraps a `tel:` anchor so the call button click intent is reported to admins
 * before the dialer opens. Reporting is fire-and-forget (uses sendBeacon when
 * available) and never blocks the native phone link.
 */
export function TrackedPhoneLink({
  href,
  sourceComponent,
  trackingMeta,
  children,
  onClick,
  ...anchorProps
}: TrackedPhoneLinkProps) {
  return (
    <a
      {...anchorProps}
      href={href}
      onClick={(e) => {
        try {
          reportCallClick({ ...(trackingMeta ?? {}), sourceComponent });
        } catch {
          // never block the user's tel: link
        }
        if (onClick) onClick(e);
      }}
    >
      {children}
    </a>
  );
}

export default TrackedPhoneLink;
