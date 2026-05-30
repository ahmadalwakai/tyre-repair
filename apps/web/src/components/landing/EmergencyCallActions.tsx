'use client';

import { Stack } from '@chakra-ui/react';
import { GoldButton } from '@/components/ui/GoldButton';
import { siteConfig } from '@/lib/site-config';
import { defaultEmergencyHref } from '@/lib/contact/whatsapp-options';
import { trackEvent } from '@/lib/analytics/track';
import type { SuggestedAction } from '@/types/coverage';

export interface EmergencyCallActionsProps {
  source: string;
  suggestedAction?: SuggestedAction;
}

/**
 * Phone-first CTA stack for Google Ads landing pages.
 *
 * - Primary: tel link (gold).
 * - Secondary: WhatsApp (outline) — only because WhatsApp config is already
 *   configured in `siteConfig`.
 * - Optional tertiary: full quote link.
 */
export function EmergencyCallActions({
  source,
  suggestedAction,
}: EmergencyCallActionsProps): React.ReactNode {
  const whatsappHref = defaultEmergencyHref();

  return (
    <Stack
      direction={{ base: 'column', sm: 'row' }}
      gap="3"
      w="full"
      align="stretch"
    >
      <GoldButton
        href={siteConfig.phoneHref}
        variant="solid"
        size="lg"
        fullWidth
        ariaLabel={`Call ${siteConfig.phoneDisplay} for emergency mobile tyre help`}
        callTrackingSource={source}
      >
        {`Call ${siteConfig.phoneDisplay}`}
      </GoldButton>
      <GoldButton
        href={whatsappHref}
        variant="outline"
        size="lg"
        isExternal
        fullWidth
        ariaLabel="Open WhatsApp to send us an emergency message"
        onClick={() => trackEvent('whatsapp_click', { source })}
      >
        WhatsApp Us
      </GoldButton>
      {suggestedAction === 'book_now' ? (
        <GoldButton
          href={siteConfig.primaryCtaHref}
          variant="ghost"
          size="lg"
          fullWidth
          ariaLabel="Start an instant emergency quote"
          onClick={() => trackEvent('booking_start', { source })}
        >
          Start instant quote
        </GoldButton>
      ) : null}
    </Stack>
  );
}
