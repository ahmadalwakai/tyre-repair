import { Button } from '@chakra-ui/react';
import NextLink from 'next/link';
import type { ReactNode } from 'react';
import { TrackedTelAnchor } from '@/components/tracking/TrackedTelAnchor';

export interface GoldButtonProps {
  href?: string;
  children: ReactNode;
  variant?: 'solid' | 'outline' | 'ghost';
  isExternal?: boolean;
  size?: 'sm' | 'md' | 'lg';
  ariaLabel?: string;
  fullWidth?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  /** Optional tag for call-click tracking when href is a tel: link. */
  callTrackingSource?: string;
}

function isInternalHref(href: string): boolean {
  if (href.startsWith('/') && !href.startsWith('//')) return true;
  return false;
}

function isTelHref(href: string): boolean {
  return href.toLowerCase().startsWith('tel:');
}

export function GoldButton({
  href,
  children,
  variant = 'solid',
  isExternal,
  size = 'md',
  ariaLabel,
  fullWidth,
  onClick,
  type = 'button',
  disabled,
  callTrackingSource,
}: GoldButtonProps) {
  const visual = variant === 'solid' ? 'gold' : variant === 'outline' ? 'outline' : 'ghost';

  const common = {
    visual,
    size,
    width: fullWidth ? 'full' : undefined,
    'aria-label': ariaLabel,
  } as const;

  if (href) {
    const internal = isInternalHref(href) && !isExternal;
    if (internal) {
      return (
        <Button asChild {...common}>
          <NextLink href={href}>{children}</NextLink>
        </Button>
      );
    }
    const tel = isTelHref(href);
    if (tel) {
      return (
        <Button asChild {...common}>
          <TrackedTelAnchor
            href={href}
            {...(callTrackingSource ? { callTrackingSource } : {})}
            {...(ariaLabel ? { ariaLabel } : {})}
          >
            {children}
          </TrackedTelAnchor>
        </Button>
      );
    }
    return (
      <Button asChild {...common}>
        <a
          href={href}
          {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          {children}
        </a>
      </Button>
    );
  }

  return (
    <Button {...common} type={type} disabled={disabled} {...(onClick ? { onClick } : {})}>
      {children}
    </Button>
  );
}
