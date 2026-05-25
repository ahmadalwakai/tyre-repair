'use client';

import { Box, HStack, Text } from '@chakra-ui/react';

/**
 * Compact mobile trust strip rendered just below the hero.
 *
 * Strict copy rules: no fake ETA, no fake ratings, no guaranteed arrival.
 */
export function MobileTrustStrip() {
  return (
    <Box
      display={{ base: 'block', md: 'none' }}
      px="4"
      pt="3"
      pb="1"
    >
      <HStack
        gap="0"
        px="3"
        py="2"
        borderRadius="full"
        borderWidth="1px"
        borderColor="border.gold"
        bg="bg.surface"
        justify="center"
        wrap="nowrap"
        overflow="hidden"
      >
        <Item label="24/7 help" />
        <Dot />
        <Item label="Repair-first" />
        <Dot />
        <Item label="We come to you" />
      </HStack>
    </Box>
  );
}

function Item({ label }: { label: string }) {
  return (
    <Text
      fontSize="xs"
      color="fg.default"
      fontWeight="semibold"
      whiteSpace="nowrap"
      px="2"
    >
      {label}
    </Text>
  );
}

function Dot() {
  return (
    <Box
      as="span"
      w="3px"
      h="3px"
      borderRadius="full"
      bg="accent.solid"
      aria-hidden
    />
  );
}
