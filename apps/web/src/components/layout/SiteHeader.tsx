'use client';
import {
  Box,
  CloseButton,
  Drawer,
  Flex,
  HStack,
  IconButton,
  Portal,
  Stack,
  Text,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { useState } from 'react';
import { FiMenu, FiPhone } from 'react-icons/fi';
import { reportCallClick } from '@/lib/lead-events/call-click';
import { siteConfig } from '@/lib/site-config';
import type { LandingNavItem } from '@/types/landing';
import { GoldButton } from '@/components/ui/GoldButton';

const NAV_ITEMS: readonly LandingNavItem[] = [
  { label: 'Services', href: '/services' },
  { label: 'Coverage', href: '/coverage' },
  { label: 'Locations', href: '/locations' },
  { label: 'FAQ', href: '/faq' },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <Box
      as="header"
      position="sticky"
      top="0"
      zIndex="50"
      bg="rgba(10,10,10,0.72)"
      backdropFilter="saturate(140%) blur(14px)"
      borderBottomWidth="1px"
      borderBottomColor="border.gold"
    >
      <Flex
        maxW="7xl"
        mx="auto"
        px={{ base: '4', md: '6' }}
        py="3"
        align="center"
        justify="space-between"
        gap="4"
      >
        <NextLink href="/" aria-label={`${siteConfig.businessName} home`}>
          <Stack gap="0">
            <Text
              fontFamily="heading"
              fontSize={{ base: 'lg', md: 'xl' }}
              color="accent.neon"
              lineHeight="1.1"
              letterSpacing="wide"
            >
              {siteConfig.businessName}
            </Text>
            <Text fontSize="2xs" color="fg.muted" textTransform="uppercase" letterSpacing="0.18em">
              {siteConfig.tagline}
            </Text>
          </Stack>
        </NextLink>

        <HStack gap="6" display={{ base: 'none', md: 'flex' }}>
          {NAV_ITEMS.map((item) => (
            <NextLink key={item.href} href={item.href}>
              <Text
                color="fg.default"
                fontSize="sm"
                fontWeight="600"
                _hover={{ color: 'accent.neon' }}
              >
                {item.label}
              </Text>
            </NextLink>
          ))}
        </HStack>

        <HStack gap="3" display={{ base: 'none', md: 'flex' }}>
          <a
            href={siteConfig.phoneHref}
            aria-label={`Call ${siteConfig.phoneDisplay}`}
            onClick={() => {
              try {
                reportCallClick({ sourceComponent: 'SITE_HEADER_DESKTOP_CALL' });
              } catch {
                /* never block tel: */
              }
            }}
          >
            <HStack gap="2" color="fg.default" _hover={{ color: 'accent.neon' }}>
              <FiPhone />
              <Text fontSize="sm" fontWeight="600">
                {siteConfig.phoneDisplay}
              </Text>
            </HStack>
          </a>
          <GoldButton href="/quote" size="sm">
            Get Quote
          </GoldButton>
        </HStack>

        <Box display={{ base: 'block', md: 'none' }}>
          <IconButton
            aria-label="Open navigation menu"
            variant="ghost"
            color="accent.neon"
            onClick={() => setOpen(true)}
          >
            <FiMenu />
          </IconButton>
        </Box>
      </Flex>

      <Drawer.Root
        open={open}
        onOpenChange={(e) => setOpen(e.open)}
        placement="end"
        size="xs"
      >
        <Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content bg="bg.surface" borderLeftWidth="1px" borderColor="border.gold">
              <Drawer.Header borderBottomWidth="1px" borderColor="border.subtle">
                <Drawer.Title color="accent.neon" fontFamily="heading">
                  Menu
                </Drawer.Title>
                <Drawer.CloseTrigger asChild>
                  <CloseButton color="fg.default" />
                </Drawer.CloseTrigger>
              </Drawer.Header>
              <Drawer.Body>
                <Stack gap="4" py="2">
                  {NAV_ITEMS.map((item) => (
                    <NextLink key={item.href} href={item.href} onClick={() => setOpen(false)}>
                      <Text fontSize="lg" color="fg.default" fontWeight="600">
                        {item.label}
                      </Text>
                    </NextLink>
                  ))}
                  <Box pt="4" borderTopWidth="1px" borderColor="border.subtle" />
                  <a
                    href={siteConfig.phoneHref}
                    aria-label={`Call ${siteConfig.phoneDisplay}`}
                    onClick={() => {
                      try {
                        reportCallClick({ sourceComponent: 'SiteHeader.mobile' });
                      } catch {
                        /* never block tel: */
                      }
                    }}
                  >
                    <HStack gap="2" color="fg.default">
                      <FiPhone />
                      <Text fontSize="md" fontWeight="600">
                        {siteConfig.phoneDisplay}
                      </Text>
                    </HStack>
                  </a>
                  <GoldButton href="/quote" fullWidth>
                    Get Quote
                  </GoldButton>
                </Stack>
              </Drawer.Body>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>
    </Box>
  );
}
