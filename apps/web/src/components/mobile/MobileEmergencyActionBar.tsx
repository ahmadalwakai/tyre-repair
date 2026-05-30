'use client';

import { Box, HStack, Text } from '@chakra-ui/react';
import NextLink from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { siteConfig } from '@/lib/site-config';
import { reportCallClick } from '@/lib/lead-events/call-click';
import {
  classifyRoute,
  resolveBarActions,
  shouldRenderMobileActionBar,
  shouldRenderHelpPill,
  revealsBarImmediately,
  MOBILE_BAR_REVEAL_SCROLL_PX,
  type MobilePrimaryAction,
} from '@/lib/mobile-actions';
import { loadQuoteProgress } from '@/lib/quote/progress-storage';
import { MobileHelpSheet } from './MobileHelpSheet';

/**
 * Mobile-only sticky bottom action bar.
 *
 * Coordination rules:
 *   - Hidden on /quote (StickyQuoteActions handles that page).
 *   - Hidden on /checkout (must not cover Stripe Payment Element).
 *   - On /checkout we render a tiny "Need help?" pill instead.
 *   - Maximum 3 visible actions; everything else lives in the help sheet.
 *   - Uses safe-area insets and 44px+ tap targets.
 */
export function MobileEmergencyActionBar() {
  const pathname = usePathname();
  const ctx = classifyRoute(pathname);
  const [scrolled, setScrolled] = useState(false);
  const [hasSavedQuote, setHasSavedQuote] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onScroll = () => {
      setScrolled(window.scrollY > MOBILE_BAR_REVEAL_SCROLL_PX);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const snap = loadQuoteProgress();
    setHasSavedQuote(Boolean(snap && snap.address));
  }, [pathname]);

  const showBar = shouldRenderMobileActionBar(ctx);
  const showPill = shouldRenderHelpPill(ctx);
  const reveal = revealsBarImmediately(ctx) || scrolled;

  if (showPill) {
    return (
      <>
        <Box
          position="fixed"
          right={{ base: '4', md: '6' }}
          bottom={`calc(env(safe-area-inset-bottom, 0px) + 1rem)`}
          zIndex="35"
          display={{ base: 'block', md: 'none' }}
        >
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            aria-label="Need help?"
            style={{
              all: 'unset',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              borderRadius: '999px',
              minHeight: '44px',
              background: 'rgba(20,20,20,0.92)',
              color: '#E30613',
              border: '1px solid #E30613',
            }}
          >
            <Text fontSize="sm" fontWeight="semibold">
              Need help?
            </Text>
          </button>
        </Box>
        <MobileHelpSheet open={helpOpen} onOpenChange={setHelpOpen} canBackToTop={scrolled} />
      </>
    );
  }

  if (!showBar || !reveal) {
    return (
      <MobileHelpSheet open={helpOpen} onOpenChange={setHelpOpen} canBackToTop={scrolled} />
    );
  }

  const actions = resolveBarActions({
    ctx,
    hasSavedQuote,
    phoneHref: siteConfig.phoneHref,
    phoneDisplay: siteConfig.phoneDisplay,
    whatsappHref: siteConfig.whatsappHref,
    primaryCtaHref: siteConfig.primaryCtaHref,
  });

  return (
    <>
      <Box
        position="fixed"
        left="0"
        right="0"
        bottom="0"
        zIndex="35"
        display={{ base: 'block', md: 'none' }}
        bg="rgba(10,10,10,0.96)"
        borderTopWidth="1px"
        borderTopColor="border.gold"
        boxShadow="glowSoft"
        pt="2"
        pb={`calc(env(safe-area-inset-bottom, 0px) + 0.5rem)`}
        px="3"
      >
        <HStack gap="2" align="stretch">
          {actions.map((a) => (
            <BarButton
              key={a.key}
              action={a}
              onSheet={() => setHelpOpen(true)}
            />
          ))}
        </HStack>
      </Box>
      <MobileHelpSheet open={helpOpen} onOpenChange={setHelpOpen} canBackToTop={scrolled} />
    </>
  );
}

interface BarButtonProps {
  action: MobilePrimaryAction;
  onSheet: () => void;
}

function BarButton({ action, onSheet }: BarButtonProps) {
  const isPrimary = Boolean(action.primary);
  const baseStyle = {
    flex: 1,
    minHeight: '48px',
    minWidth: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 12px',
    borderRadius: '12px',
    fontWeight: 600,
    fontSize: '0.9rem',
    textAlign: 'center' as const,
    background: isPrimary ? '#E30613' : 'transparent',
    color: isPrimary ? '#0A0A0A' : '#F5F5F5',
    border: isPrimary ? '1px solid #E30613' : '1px solid rgba(212,175,55,0.4)',
    overflow: 'hidden',
    whiteSpace: 'nowrap' as const,
    textOverflow: 'ellipsis',
  };

  if (action.kind === 'sheet') {
    return (
      <button
        type="button"
        onClick={onSheet}
        aria-label="More actions"
        style={baseStyle}
      >
        {action.label}
      </button>
    );
  }

  const href = action.href ?? '#';
  const isTel = href.startsWith('tel:');
  const isHttp = href.startsWith('http');

  if (isTel) {
    return (
      <a
        href={href}
        aria-label={action.label}
        style={baseStyle}
        onClick={() => {
          if (action.callTrackingSource) {
            reportCallClick({ sourceComponent: action.callTrackingSource });
          }
        }}
      >
        {action.label}
      </a>
    );
  }
  if (isHttp || action.external) {
    return (
      <a
        href={href}
        target={action.external ? '_blank' : undefined}
        rel={action.external ? 'noopener noreferrer' : undefined}
        aria-label={action.label}
        style={baseStyle}
      >
        {action.label}
      </a>
    );
  }
  return (
    <NextLink href={href} aria-label={action.label} style={baseStyle}>
      {action.label}
    </NextLink>
  );
}
