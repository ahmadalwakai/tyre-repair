'use client';

import { useEffect, useMemo, useState } from 'react';
import { Box, Drawer, HStack, Stack, Text } from '@chakra-ui/react';
import { FaWhatsapp } from 'react-icons/fa';
import { FiPhone, FiX } from 'react-icons/fi';
import { usePathname } from 'next/navigation';
import { siteConfig } from '@/lib/site-config';
import { reportCallClick } from '@/lib/lead-events/call-click';
import { loadQuoteProgress } from '@/lib/quote/progress-storage';
import {
  buildWhatsAppHref,
  buildWhatsAppOptions,
  defaultEmergencyHref,
  type WhatsAppOption,
  type WhatsAppPage,
} from '@/lib/contact/whatsapp-options';
import type { CapturedLocation } from '@/types/quote';

export interface WhatsAppQuickHelpSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function classifyWhatsAppPage(pathname: string | null | undefined): {
  page: WhatsAppPage;
  trackingId: string | null;
} {
  if (!pathname) return { page: 'other', trackingId: null };
  const path = pathname.toLowerCase();
  if (path === '/' || path === '') return { page: 'home', trackingId: null };
  if (path === '/quote' || path.startsWith('/quote/') || path.startsWith('/quote?')) {
    return { page: 'quote', trackingId: null };
  }
  if (path === '/checkout' || path.startsWith('/checkout?') || path.startsWith('/checkout/')) {
    return { page: 'checkout', trackingId: null };
  }
  if (path.startsWith('/track/')) {
    const segments = pathname.split('/').filter(Boolean);
    // /track/<trackingId>
    const trackingId = segments[1] ? decodeURIComponent(segments[1]) : null;
    return { page: 'tracking', trackingId };
  }
  return { page: 'other', trackingId: null };
}

function summariseCapturedLocation(loc: CapturedLocation | null | undefined): string | null {
  if (!loc) return null;
  const parts: string[] = [];
  if (loc.addressLine1) parts.push(loc.addressLine1);
  if (loc.addressLine2) parts.push(loc.addressLine2);
  if (loc.city) parts.push(loc.city);
  if (loc.postcode) parts.push(loc.postcode);
  const joined = parts.filter(Boolean).join(', ');
  if (joined.length > 0) return joined;
  if (typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
    return `GPS ${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`;
  }
  return null;
}

/**
 * Mobile-friendly WhatsApp Quick Help bottom sheet.
 *
 * Replaces the immediate `https://wa.me/...` navigation with a simple choice
 * of pre-filled message templates. Stressed mobile users pick what they need;
 * tapping an option opens WhatsApp with the encoded message.
 *
 * Coordination:
 *   - Uses Chakra v3 `<Drawer.Root placement="bottom">` (no new UI lib).
 *   - Does not affect call-click tracking, quote flow, checkout, Stripe,
 *     pricing, admin app or SEO.
 *   - Never sends payment, Stripe, auth or admin-only data.
 */
export function WhatsAppQuickHelpSheet({
  open,
  onOpenChange,
}: WhatsAppQuickHelpSheetProps) {
  const pathname = usePathname();
  const { page, trackingId } = useMemo(
    () => classifyWhatsAppPage(pathname),
    [pathname],
  );

  const [hasSavedQuote, setHasSavedQuote] = useState(false);
  const [locationSummary, setLocationSummary] = useState<string | null>(null);
  const [problemSummary, setProblemSummary] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const snap = loadQuoteProgress();
    setHasSavedQuote(Boolean(snap && snap.address));
    setLocationSummary(summariseCapturedLocation(snap?.address ?? null));
    if (snap?.tyre?.size) {
      setProblemSummary(`Replacement tyre ${snap.tyre.size}`);
    } else if (snap?.tyre?.selected) {
      setProblemSummary(
        `Replacement tyre ${snap.tyre.selected.brand} ${snap.tyre.selected.model}`,
      );
    } else {
      setProblemSummary(null);
    }
  }, [open]);

  const options: WhatsAppOption[] = useMemo(
    () =>
      buildWhatsAppOptions({
        page,
        trackingId,
        hasSavedQuote,
        locationSummary,
        problemSummary,
      }),
    [page, trackingId, hasSavedQuote, locationSummary, problemSummary],
  );

  const handleSelect = (option: WhatsAppOption) => {
    const href = buildWhatsAppHref(option.message);
    onOpenChange(false);
    if (typeof window !== 'undefined') {
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCallInstead = () => {
    reportCallClick({ sourceComponent: 'WhatsAppQuickHelpSheet.callInstead' });
    onOpenChange(false);
    if (typeof window !== 'undefined') {
      window.location.href = siteConfig.phoneHref;
    }
  };

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
          color="fg.default"
          borderTopWidth="2px"
          borderTopColor="border.gold"
          borderTopRadius="2xl"
          boxShadow="glowMedium"
          pb={`calc(env(safe-area-inset-bottom, 0px) + 1rem)`}
        >
          <Drawer.Header pb="2">
            <HStack justify="space-between" align="flex-start">
              <Stack gap="1" flex="1" minW="0">
                <Drawer.Title color="accent.neon" fontFamily="heading">
                  <HStack gap="2">
                    <Box as={FaWhatsapp} color="#25D366" aria-hidden />
                    <Text as="span">WhatsApp help</Text>
                  </HStack>
                </Drawer.Title>
                <Text fontSize="sm" color="fg.muted">
                  Choose what you want to send.
                </Text>
              </Stack>
              <Drawer.CloseTrigger asChild>
                <button
                  type="button"
                  aria-label="Close WhatsApp help"
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    minWidth: '44px',
                    minHeight: '44px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '999px',
                    color: '#F5F5F5',
                  }}
                >
                  <FiX />
                </button>
              </Drawer.CloseTrigger>
            </HStack>
          </Drawer.Header>
          <Drawer.Body pt="2">
            <Stack gap="3">
              {options.map((option) => (
                <OptionCard
                  key={option.id}
                  option={option}
                  onSelect={() => handleSelect(option)}
                />
              ))}

              <button
                type="button"
                onClick={handleCallInstead}
                aria-label={`Call ${siteConfig.phoneDisplay} instead`}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  minHeight: '44px',
                  padding: '0 14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(212,175,55,0.4)',
                  color: '#E30613',
                  marginTop: '4px',
                  fontWeight: 600,
                }}
              >
                <FiPhone aria-hidden />
                <span>Call {siteConfig.phoneDisplay} instead</span>
              </button>

              {/* JS-disabled fallback: a plain link to WhatsApp with the
                  default emergency message. Hidden when JS is enabled because
                  the option cards above already cover this. */}
              <noscript>
                <a
                  href={defaultEmergencyHref()}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#E30613', textAlign: 'center', display: 'block' }}
                >
                  Open WhatsApp
                </a>
              </noscript>
            </Stack>
          </Drawer.Body>
        </Drawer.Content>
      </Drawer.Positioner>
    </Drawer.Root>
  );
}

interface OptionCardProps {
  option: WhatsAppOption;
  onSelect: () => void;
}

function OptionCard({ option, onSelect }: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={option.title}
      style={{
        all: 'unset',
        cursor: 'pointer',
        display: 'block',
      }}
    >
      <HStack
        gap="3"
        px="4"
        py="3"
        borderRadius="lg"
        borderWidth="1px"
        borderColor="border.subtle"
        bg="bg.surface"
        minH="56px"
        _hover={{ borderColor: 'border.gold' }}
      >
        <Box fontSize="xl" color="#25D366" aria-hidden>
          <FaWhatsapp />
        </Box>
        <Stack gap="0" flex="1" minW="0">
          <Text fontWeight="semibold" lineClamp={1}>
            {option.title}
          </Text>
          <Text fontSize="xs" color="fg.muted" lineClamp={1}>
            {option.preview}
          </Text>
        </Stack>
      </HStack>
    </button>
  );
}

export default WhatsAppQuickHelpSheet;
