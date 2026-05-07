import { HStack, Text } from '@chakra-ui/react';
import type { ReactNode } from 'react';

export interface GoldBadgeProps {
  children: ReactNode;
  icon?: ReactNode;
}

export function GoldBadge({ children, icon }: GoldBadgeProps) {
  return (
    <HStack
      as="span"
      gap="2"
      px="3"
      py="1.5"
      borderRadius="full"
      borderWidth="1px"
      borderColor="border.gold"
      bg="rgba(212,175,55,0.08)"
      color="accent.neon"
      fontSize="sm"
      fontWeight="600"
      lineHeight="1"
    >
      {icon}
      <Text as="span">{children}</Text>
    </HStack>
  );
}
