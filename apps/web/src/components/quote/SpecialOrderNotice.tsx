import { Box, Text } from '@chakra-ui/react';
import { SPECIAL_ORDER_COPY } from '@/lib/quote/tyres';

export function SpecialOrderNotice() {
  return (
    <Box
      px="3"
      py="2"
      borderRadius="md"
      borderWidth="1px"
      borderColor="border.gold"
      bg="rgba(212,175,55,0.08)"
    >
      <Text fontSize="sm" color="accent.neon" fontWeight="600">
        {SPECIAL_ORDER_COPY}
      </Text>
    </Box>
  );
}
