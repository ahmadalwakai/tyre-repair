'use client';
import { Badge, Box, Flex, HStack, Stack, Text } from '@chakra-ui/react';
import { availabilityLabel } from '@/lib/quote/tyres';
import { GoldButton } from '@/components/ui/GoldButton';
import { SpecialOrderNotice } from './SpecialOrderNotice';
import type { TyreSearchResultItem } from '@/types/quote';

export interface TyreOptionCardProps {
  tyre: TyreSearchResultItem;
  selected: boolean;
  onSelect: (tyre: TyreSearchResultItem) => void;
}

const TIER_LABEL: Record<TyreSearchResultItem['tier'], string> = {
  budget: 'Budget',
  mid_range: 'Mid-range',
  premium: 'Premium',
};

const TYPE_LABEL: Record<TyreSearchResultItem['type'], string> = {
  summer: 'Summer',
  winter: 'Winter',
  all_season: 'All-season',
  run_flat: 'Run-flat',
  commercial: 'Commercial',
};

const BADGE_LABEL: Record<NonNullable<TyreSearchResultItem['recommendationBadge']>, string> = {
  fastest_fitting: 'Fastest fitting',
  fastest_available: 'Fastest available',
  best_value: 'Best value',
  budget_option: 'Budget pick',
  premium_option: 'Premium pick',
};

export function TyreOptionCard({ tyre, selected, onSelect }: TyreOptionCardProps) {
  const price = tyre.basePriceGbp.toFixed(2);
  return (
    <Stack
      gap="3"
      p={{ base: '4', md: '5' }}
      borderRadius="lg"
      borderWidth="1px"
      borderColor={selected ? 'border.gold' : 'border.subtle'}
      bg="bg.surface"
      boxShadow={selected ? 'glowSoft' : 'none'}
      transition="border-color 0.2s, box-shadow 0.2s"
      _hover={{ borderColor: 'border.gold' }}
    >
      {tyre.recommendationBadge ? (
        <Badge
          alignSelf="flex-start"
          bg="bg.canvas"
          color="accent.neon"
          borderWidth="1px"
          borderColor="border.gold"
          fontFamily="heading"
          fontSize="xs"
          px="2"
          py="1"
          textTransform="uppercase"
          letterSpacing="0.05em"
        >
          {BADGE_LABEL[tyre.recommendationBadge]}
        </Badge>
      ) : null}
      <Flex justify="space-between" align="flex-start" gap="3" wrap="wrap">
        <Stack gap="1" flex="1" minW="0">
          <Text fontFamily="heading" fontSize="lg" color="fg.default">
            {tyre.brand} {tyre.model}
          </Text>
          <Text color="fg.muted" fontSize="sm">
            {tyre.sizeLabel} · {tyre.speedRating} · LI {tyre.loadIndex}
          </Text>
        </Stack>
        <Stack gap="1" align="flex-end">
          <Text fontFamily="heading" fontSize="xl" color="accent.neon">
            £{price}
          </Text>
          <HStack gap="2">
            <Badge bg="bg.canvas" color="fg.default" borderWidth="1px" borderColor="border.subtle">
              {TIER_LABEL[tyre.tier]}
            </Badge>
            <Badge bg="bg.canvas" color="fg.muted" borderWidth="1px" borderColor="border.subtle">
              {TYPE_LABEL[tyre.type]}
            </Badge>
          </HStack>
        </Stack>
      </Flex>

      <Box>
        {tyre.availability === 'special_order' ? (
          <SpecialOrderNotice />
        ) : (
          <Text fontSize="sm" color={tyre.availability === 'low_stock' ? 'accent.neon' : 'fg.muted'}>
            {availabilityLabel(tyre.availability)} ({tyre.quantityAvailable} available)
          </Text>
        )}
      </Box>

      <GoldButton
        onClick={() => onSelect(tyre)}
        variant={selected ? 'solid' : 'outline'}
        fullWidth
      >
        {selected ? 'Selected' : 'Use this tyre'}
      </GoldButton>
    </Stack>
  );
}
