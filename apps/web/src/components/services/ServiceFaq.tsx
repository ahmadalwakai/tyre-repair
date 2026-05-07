import { Accordion, Box, Container, Heading, Stack, Text } from '@chakra-ui/react';
import type { ServiceFaqItem, LocationFaqItem } from '@/types/seo';

export interface FaqAccordionProps {
  items: readonly (ServiceFaqItem | LocationFaqItem)[];
  heading?: string;
}

export function ServiceFaq({ items, heading = 'Frequently asked questions' }: FaqAccordionProps) {
  if (items.length === 0) return null;
  return (
    <Box as="section" bg="bg.canvas" py={{ base: '10', md: '14' }} px={{ base: '4', md: '6' }}>
      <Container maxW="3xl">
        <Stack gap="6">
          <Heading as="h2" fontFamily="heading" fontSize={{ base: '2xl', md: '3xl' }} color="fg.default">
            {heading}
          </Heading>
          <Accordion.Root collapsible multiple={false}>
            {items.map((it, i) => (
              <Accordion.Item key={i} value={String(i)}>
                <Accordion.ItemTrigger>
                  <Box flex="1" textAlign="left">
                    <Text fontWeight="700" color="fg.default" fontSize={{ base: 'md', md: 'lg' }}>
                      {it.question}
                    </Text>
                  </Box>
                  <Accordion.ItemIndicator />
                </Accordion.ItemTrigger>
                <Accordion.ItemContent>
                  <Accordion.ItemBody>
                    <Text color="fg.muted" fontSize="md" lineHeight="1.7">
                      {it.answer}
                    </Text>
                  </Accordion.ItemBody>
                </Accordion.ItemContent>
              </Accordion.Item>
            ))}
          </Accordion.Root>
        </Stack>
      </Container>
    </Box>
  );
}
