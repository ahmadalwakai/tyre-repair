'use client';

import { Drawer, HStack, Stack, Text, Box } from '@chakra-ui/react';
import { FiPhone } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { siteConfig } from '@/lib/site-config';
import { reportCallClick } from '@/lib/lead-events/call-click';
import { buildWhatsappHref } from '@/lib/contact/whatsapp-message';

export interface HelpMeChooseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ChoiceRow {
  key: string;
  label: string;
  hint: string;
  guidance: string;
}

const CHOICES: ChoiceRow[] = [
  {
    key: 'flat',
    label: 'Flat or puncture',
    hint: 'Tyre is soft or flat right now',
    guidance:
      'We can come out and assess the puncture. If it is safe to repair we will repair it; otherwise we replace.',
  },
  {
    key: 'damaged',
    label: 'Tyre damaged or blown out',
    hint: 'Sidewall split, blowout or kerb damage',
    guidance:
      'Replacement is usually needed. Pick your tyre size to see what we have on the van.',
  },
  {
    key: 'pressure',
    label: 'Keeps losing pressure',
    hint: 'Slow leak, valve or seal issue',
    guidance:
      'We will assess on site. Many slow leaks can be repaired without a new tyre.',
  },
  {
    key: 'unknown-size',
    label: 'I don\u2019t know my tyre size',
    hint: 'No worries — we can confirm it on the call or on arrival',
    guidance:
      'Call us and we will help you read the size off the tyre, or we will check it when we arrive.',
  },
  {
    key: 'replacement',
    label: 'I need a new tyre',
    hint: 'You already know you want a replacement',
    guidance:
      'Pick your tyre size and we will show what is in stock on the mobile fitting van.',
  },
];

/**
 * "Not sure what you need?" bottom sheet.
 *
 * We deliberately do NOT mutate the QuoteFlow reducer from here. The current
 * reducer requires a real selected tyre to advance to the quote step, and the
 * assessment-only path is not yet wired through the public quotes API. So we
 * instead point unsure customers to the call/WhatsApp escape hatch with the
 * right context — which is exactly what the human admin already handles best.
 */
export function HelpMeChooseSheet({ open, onOpenChange }: HelpMeChooseSheetProps) {
  return (
    <Drawer.Root
      open={open}
      onOpenChange={(e) => onOpenChange(e.open)}
      placement="bottom"
      size="md"
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
          <Drawer.Header>
            <Drawer.Title color="accent.neon" fontFamily="heading">
              Not sure what you need?
            </Drawer.Title>
            <Drawer.CloseTrigger />
          </Drawer.Header>
          <Drawer.Body>
            <Stack gap="3">
              {CHOICES.map((c) => (
                <Stack
                  key={c.key}
                  gap="1"
                  px="3"
                  py="3"
                  borderRadius="lg"
                  borderWidth="1px"
                  borderColor="border.subtle"
                  bg="bg.surface"
                >
                  <Text fontWeight="semibold" color="fg.default">
                    {c.label}
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    {c.hint}
                  </Text>
                  <Text fontSize="sm" color="fg.default">
                    {c.guidance}
                  </Text>
                </Stack>
              ))}

              <Stack gap="2" pt="2">
                <Text fontSize="sm" color="fg.muted">
                  Still not sure? Talk to us — we will sort it out in 30 seconds.
                </Text>
                <HStack gap="2">
                  <a
                    href={siteConfig.phoneHref}
                    onClick={() =>
                      reportCallClick({ sourceComponent: 'HelpMeChooseSheet.call' })
                    }
                    style={{
                      flex: 1,
                      minHeight: '48px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      borderRadius: '12px',
                      background: '#E30613',
                      color: '#0A0A0A',
                      fontWeight: 700,
                    }}
                    aria-label={`Call ${siteConfig.phoneDisplay}`}
                  >
                    <Box as="span" aria-hidden>
                      <FiPhone />
                    </Box>
                    Call us
                  </a>
                  <a
                    href={buildWhatsappHref({ hasSavedQuote: true })}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flex: 1,
                      minHeight: '48px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      borderRadius: '12px',
                      background: 'transparent',
                      color: '#F5F5F5',
                      border: '1px solid rgba(212,175,55,0.5)',
                      fontWeight: 600,
                    }}
                    aria-label="WhatsApp us"
                  >
                    <Box as="span" aria-hidden>
                      <FaWhatsapp />
                    </Box>
                    WhatsApp
                  </a>
                </HStack>
              </Stack>
            </Stack>
          </Drawer.Body>
        </Drawer.Content>
      </Drawer.Positioner>
    </Drawer.Root>
  );
}
