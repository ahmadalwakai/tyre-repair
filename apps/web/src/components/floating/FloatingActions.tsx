'use client';

import { useEffect, useState } from 'react';
import { Box, HStack, IconButton, VStack } from '@chakra-ui/react';
import NextLink from 'next/link';
import { FaWhatsapp } from 'react-icons/fa';
import { FiArrowUp, FiPhone, FiShoppingCart } from 'react-icons/fi';
import { siteConfig } from '@/lib/site-config';
import { TrackedTelAnchor } from '@/components/tracking/TrackedTelAnchor';
import { MobileMount } from '@/components/mobile/MobileMount';
import { WhatsAppQuickHelpSheet } from '@/components/mobile/WhatsAppQuickHelpSheet';
import { defaultEmergencyHref } from '@/lib/contact/whatsapp-options';

export interface FloatingActionsProps {
  cartItemCount?: number;
}

const BACK_TO_TOP_THRESHOLD_PX = 500;

export function FloatingActions({ cartItemCount = 0 }: FloatingActionsProps) {
  const showCart = cartItemCount > 0;
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [whatsappSheetOpen, setWhatsappSheetOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleScroll = () => {
      setShowBackToTop(window.scrollY > BACK_TO_TOP_THRESHOLD_PX);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleBackToTop = () => {
    if (typeof window === 'undefined') {
      return;
    }
    const prefersReducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  };

  return (
    <>
    <Box
      position="fixed"
      // Lift the floating stack on mobile so it never collides with the new
      // <MobileEmergencyActionBar /> at the bottom of the viewport (~64px).
      bottom={{ base: 'calc(env(safe-area-inset-bottom, 0px) + 5.25rem)', md: '6' }}
      right={{ base: '4', md: '6' }}
      zIndex="40"
      pointerEvents="none"
    >
      <VStack gap="3" align="flex-end">
        {showBackToTop && (
          <IconButton
            aria-label="Back to top"
            onClick={handleBackToTop}
            size="lg"
            borderRadius="full"
            bg="bg.canvas"
            color="accent.solid"
            borderWidth="1px"
            borderColor="border.gold"
            boxShadow="glowSoft"
            pointerEvents="auto"
            minW="44px"
            minH="44px"
            _hover={{ boxShadow: 'glowMedium', bg: 'bg.surface' }}
          >
            <FiArrowUp />
          </IconButton>
        )}

        {showCart && (
          <NextLink href="/cart" aria-label={`Cart with ${cartItemCount} item${cartItemCount === 1 ? '' : 's'}`}>
            <IconButton
              aria-label="Open cart"
              size="lg"
              borderRadius="full"
              bg="bg.surface"
              color="accent.neon"
              borderWidth="1px"
              borderColor="border.gold"
              boxShadow="glowSoft"
              pointerEvents="auto"
              _hover={{ boxShadow: 'glowMedium' }}
            >
              <HStack gap="1">
                <FiShoppingCart />
              </HStack>
            </IconButton>
          </NextLink>
        )}

        <a
          href={defaultEmergencyHref()}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat on WhatsApp"
          onClick={(e) => {
            e.preventDefault();
            setWhatsappSheetOpen(true);
          }}
        >
          <IconButton
            aria-label="WhatsApp TyreRepair UK"
            size="lg"
            borderRadius="full"
            bg="#128C7E"
            color="white"
            boxShadow="glowSoft"
            pointerEvents="auto"
            _hover={{ bg: '#0E6F65', boxShadow: 'glowMedium' }}
          >
            <FaWhatsapp />
          </IconButton>
        </a>

        <TrackedTelAnchor
          href={siteConfig.phoneHref}
          ariaLabel={`Call ${siteConfig.phoneDisplay}`}
          callTrackingSource="FLOATING_CALL"
        >
          <IconButton
            aria-label={`Call ${siteConfig.phoneDisplay}`}
            size="lg"
            borderRadius="full"
            bg="accent.solid"
            color="bg.canvas"
            boxShadow="glowMedium"
            pointerEvents="auto"
            _hover={{ boxShadow: 'glowStrong' }}
          >
            <FiPhone />
          </IconButton>
        </TrackedTelAnchor>
      </VStack>
    </Box>
    <MobileMount />
    <WhatsAppQuickHelpSheet
      open={whatsappSheetOpen}
      onOpenChange={setWhatsappSheetOpen}
    />
    </>
  );
}

export default FloatingActions;
