import { Box, Heading, Stack, Text, List, ListItem } from '@chakra-ui/react';
import type { ReactNode } from 'react';

export interface ContentSectionProps {
  heading: string;
  children?: ReactNode;
  paragraphs?: readonly string[];
  bullets?: readonly string[];
  level?: 'h2' | 'h3';
}

export function ContentSection({
  heading,
  children,
  paragraphs,
  bullets,
  level = 'h2',
}: ContentSectionProps) {
  return (
    <Stack gap="4" as="section">
      <Heading
        as={level}
        fontFamily="heading"
        fontSize={{ base: 'xl', md: '2xl' }}
        color="fg.default"
        lineHeight="1.2"
      >
        {heading}
      </Heading>
      {paragraphs?.map((p, i) => (
        <Text key={i} color="fg.muted" fontSize={{ base: 'md', md: 'md' }} lineHeight="1.7">
          {p}
        </Text>
      ))}
      {bullets && bullets.length > 0 ? (
        <List.Root pl="5">
          {bullets.map((b, i) => (
            <ListItem key={i} color="fg.muted">
              {b}
            </ListItem>
          ))}
        </List.Root>
      ) : null}
      {children ? <Box>{children}</Box> : null}
    </Stack>
  );
}
