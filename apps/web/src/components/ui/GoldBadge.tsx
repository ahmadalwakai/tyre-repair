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
      borderColor="border.accent"
      bg="rgba(227,6,19,0.10)"
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
