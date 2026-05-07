'use client';
import { Stack, Text } from '@chakra-ui/react';
import type { ReactNode } from 'react';

export interface LocationMethodCardProps {
  title: string;
  description: string;
  icon?: ReactNode;
  children: ReactNode;
}

export function LocationMethodCard({
  title,
  description,
  icon,
  children,
}: LocationMethodCardProps) {
  return (
    <Stack
      gap="3"
      p={{ base: '4', md: '5' }}
      borderRadius="lg"
      borderWidth="1px"
      borderColor="border.subtle"
      bg="bg.surface"
      _hover={{ borderColor: 'border.gold' }}
      transition="border-color 0.2s"
    >
      <Stack direction="row" gap="3" align="flex-start">
        {icon && (
          <Text color="accent.neon" fontSize="xl" aria-hidden>
            {icon}
          </Text>
        )}
        <Stack gap="1" flex="1">
          <Text fontFamily="heading" fontSize="md" color="fg.default">
            {title}
          </Text>
          <Text color="fg.muted" fontSize="sm">
            {description}
          </Text>
        </Stack>
      </Stack>
      {children}
    </Stack>
  );
}
