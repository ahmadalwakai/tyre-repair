'use client';

import { Drawer, HStack, Stack, Text, Box } from '@chakra-ui/react';
import NextLink from 'next/link';
import { FiPhone, FiArrowUp, FiClock } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { useEffect, useState } from 'react';
import { siteConfig } from '@/lib/site-config';
import { reportCallClick } from '@/lib/lead-events/call-click';
import { buildWhatsappHref } from '@/lib/contact/whatsapp-message';
import { loadQuoteProgress } from '@/lib/quote/progress-storage';

export interface MobileHelpSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Show "Back to top" row only when the page is actually scrolled. */
  canBackToTop?: boolean;
}

/**
 * Bottom sheet of secondary contact + navigation actions.
 *
 * Uses Chakra v3 `<Drawer.Root placement="bottom">` so we get accessibility
 * (focus trap, ESC, overlay close) for free without introducing a new UI lib.
 */
export function MobileHelpSheet({ open, onOpenChange, canBackToTop }: MobileHelpSheetProps) {
  const [hasSavedQuote, setHasSavedQuote] = useState(false);

  useEffect(() => {
    if (!open) return;
    const snap = loadQuoteProgress();
    setHasSavedQuote(Boolean(snap && snap.address));
  }, [open]);

  const whatsappHref = buildWhatsappHref({ hasSavedQuote });

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(e) => onOpenChange(e.open)}
      placement="bottom"
      size="sm"
    >
      <Drawer.Backdrop />
      <Drawer.Positioner>
        <Drawer.Content
          bg="bg.canvas"
          borderTopWidth="2px"
          borderTopColor="border.gold"
          borderTopRadius="2xl"
          pb={`calc(env(safe-area-inset-bottom, 0px) + 1rem)`}
        >
          <Drawer.Header pb="2">
            <Drawer.Title color="accent.neon" fontFamily="heading">
              How can we help?
            </Drawer.Title>
            <Drawer.CloseTrigger />
          </Drawer.Header>
          <Drawer.Body pt="2">
            <Stack gap="3">
              <SheetRow
                href={siteConfig.phoneHref}
                icon={<FiPhone />}
                label={`Call ${siteConfig.phoneDisplay}`}
                hint="24/7 emergency line"
                primary
                onClick={() => {
                  reportCallClick({ sourceComponent: 'MobileHelpSheet.call' });
                }}
              />
              <SheetRow
                href={whatsappHref}
                external
                icon={<FaWhatsapp />}
                label="WhatsApp us"
                hint="We reply fast on WhatsApp"
              />
              <SheetRow
                href={siteConfig.primaryCtaHref}
                icon={<FiClock />}
                label={hasSavedQuote ? 'Continue your quote' : 'Get instant quote'}
                hint={hasSavedQuote ? 'Pick up where you left off' : '60 seconds, no account needed'}
                onClick={() => onOpenChange(false)}
              />
              {canBackToTop && (
                <SheetRow
                  icon={<FiArrowUp />}
                  label="Back to top"
                  hint="Jump to the top of this page"
                  onClick={() => {
                    if (typeof window === 'undefined') return;
                    const reduced =
                      typeof window.matchMedia === 'function' &&
                      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                    window.scrollTo({ top: 0, left: 0, behavior: reduced ? 'auto' : 'smooth' });
                    onOpenChange(false);
                  }}
                />
              )}
            </Stack>
          </Drawer.Body>
        </Drawer.Content>
      </Drawer.Positioner>
    </Drawer.Root>
  );
}

interface SheetRowProps {
  href?: string;
  external?: boolean;
  icon: React.ReactNode;
  label: string;
  hint?: string;
  primary?: boolean;
  onClick?: () => void;
}

function SheetRow({ href, external, icon, label, hint, primary, onClick }: SheetRowProps) {
  const styles = {
    bg: primary ? 'accent.solid' : 'bg.surface',
    color: primary ? 'bg.canvas' : 'fg.default',
    borderColor: primary ? 'accent.solid' : 'border.subtle',
  } as const;

  const inner = (
    <HStack
      gap="3"
      px="4"
      py="3"
      borderRadius="lg"
      borderWidth="1px"
      minH="56px"
      bg={styles.bg}
      color={styles.color}
      borderColor={styles.borderColor}
      _hover={{ borderColor: 'border.gold' }}
    >
      <Box fontSize="xl">{icon}</Box>
      <Stack gap="0" flex="1" minW="0">
        <Text fontWeight="semibold" lineClamp={1}>
          {label}
        </Text>
        {hint && (
          <Text fontSize="xs" opacity={0.85} lineClamp={1}>
            {hint}
          </Text>
        )}
      </Stack>
    </HStack>
  );

  if (!href) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={{ all: 'unset', cursor: 'pointer', display: 'block' }}
        aria-label={label}
      >
        {inner}
      </button>
    );
  }

  if (external || href.startsWith('tel:') || href.startsWith('http')) {
    return (
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        onClick={onClick}
        aria-label={label}
        style={{ display: 'block' }}
      >
        {inner}
      </a>
    );
  }

  return (
    <NextLink
      href={href}
      {...(onClick ? { onClick } : {})}
      aria-label={label}
      style={{ display: 'block' }}
    >
      {inner}
    </NextLink>
  );
}
