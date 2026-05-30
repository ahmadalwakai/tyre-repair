import { Box, Stack, Text } from '@chakra-ui/react';

export interface StatCardProps {
  value: string;
  label: string;
  description?: string;
}

export function StatCard({ value, label, description }: StatCardProps) {
  return (
    <Box
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="lg"
      bg="bg.surface"
      p={{ base: '4', md: '5' }}
      transition="border-color 0.2s, box-shadow 0.2s"
      _hover={{ borderColor: 'border.accent', boxShadow: 'glowSoft' }}
    >
      <Stack gap="1">
        <Text
          fontFamily="heading"
          fontSize={{ base: 'xl', md: '2xl' }}
          color="accent.neon"
          lineHeight="1.1"
        >
          {value}
        </Text>
        <Text fontSize="sm" color="fg.default" fontWeight="600">
          {label}
        </Text>
        {description && (
          <Text fontSize="xs" color="fg.muted">
            {description}
          </Text>
        )}
      </Stack>
    </Box>
  );
}
