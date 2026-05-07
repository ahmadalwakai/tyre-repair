import { Box, HStack, Text } from '@chakra-ui/react';
import { FiAlertCircle } from 'react-icons/fi';
import type { ReactNode } from 'react';

export interface ContentCalloutProps {
  children: ReactNode;
  tone?: 'info' | 'warning';
}

export function ContentCallout({ children, tone = 'info' }: ContentCalloutProps) {
  const accent = tone === 'warning' ? 'rgba(255,164,0,0.55)' : 'border.gold';
  return (
    <Box
      borderLeftWidth="3px"
      borderLeftColor={accent}
      bg="rgba(212,175,55,0.06)"
      px="4"
      py="3"
      borderRadius="md"
    >
      <HStack gap="3" align="flex-start">
        <Box color="accent.neon" mt="1">
          <FiAlertCircle />
        </Box>
        <Text color="fg.default" fontSize="sm" lineHeight="1.6">
          {children}
        </Text>
      </HStack>
    </Box>
  );
}
