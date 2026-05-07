import { Box, Heading, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import NextLink from 'next/link';
import type { InternalLinkItem } from '@/types/seo';

export interface InternalLinkGridProps {
  title: string;
  intro?: string;
  links: readonly InternalLinkItem[];
  columns?: { base: number; md: number };
}

export function InternalLinkGrid({
  title,
  intro,
  links,
  columns = { base: 1, md: 3 },
}: InternalLinkGridProps) {
  if (links.length === 0) return null;
  return (
    <Stack gap="5" as="section" aria-label={title}>
      <Stack gap="2">
        <Heading as="h2" fontFamily="heading" fontSize={{ base: 'xl', md: '2xl' }} color="fg.default">
          {title}
        </Heading>
        {intro ? (
          <Text color="fg.muted" fontSize="md">
            {intro}
          </Text>
        ) : null}
      </Stack>
      <SimpleGrid columns={columns} gap={{ base: '3', md: '4' }}>
        {links.map((l) => (
          <NextLink key={l.href} href={l.href} prefetch={false}>
            <Box
              borderWidth="1px"
              borderColor="border.subtle"
              _hover={{ borderColor: 'border.gold', bg: 'rgba(212,175,55,0.06)' }}
              transition="border-color 120ms, background-color 120ms"
              borderRadius="lg"
              p="4"
              h="100%"
            >
              <Stack gap="1">
                <Text fontWeight="700" color="fg.default" fontSize="md">
                  {l.label}
                </Text>
                {l.description ? (
                  <Text fontSize="sm" color="fg.muted" lineHeight="1.5">
                    {l.description}
                  </Text>
                ) : null}
              </Stack>
            </Box>
          </NextLink>
        ))}
      </SimpleGrid>
    </Stack>
  );
}
