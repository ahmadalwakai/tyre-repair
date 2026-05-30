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
              borderColor="accent.neon"
              boxShadow="0 0 0 1px rgba(240,24,37,0.35), 0 0 16px rgba(240,24,37,0.2), inset 0 0 10px rgba(240,24,37,0.06)"
              _hover={{
                borderColor: 'accent.neon',
                bg: 'rgba(240,24,37,0.06)',
                boxShadow:
                  '0 0 0 1px rgba(240,24,37,0.6), 0 0 26px rgba(240,24,37,0.5), inset 0 0 14px rgba(240,24,37,0.12)',
                transform: 'translateY(-2px)',
              }}
              transition="border-color 200ms ease, background-color 200ms ease, box-shadow 200ms ease, transform 200ms ease"
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
