import { Box, HStack, IconButton, VStack } from '@chakra-ui/react';
import NextLink from 'next/link';
import { FaWhatsapp } from 'react-icons/fa';
import { FiPhone, FiShoppingCart } from 'react-icons/fi';
import { siteConfig } from '@/lib/site-config';
import { TrackedTelAnchor } from '@/components/tracking/TrackedTelAnchor';

export interface FloatingActionsProps {
  cartItemCount?: number;
}

export function FloatingActions({ cartItemCount = 0 }: FloatingActionsProps) {
  const showCart = cartItemCount > 0;

  return (
    <Box
      position="fixed"
      bottom={{ base: '4', md: '6' }}
      right={{ base: '4', md: '6' }}
      zIndex="40"
      pointerEvents="none"
    >
      <VStack gap="3" align="flex-end">
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

        <a href={siteConfig.whatsappHref} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp">
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
  );
}

export default FloatingActions;
