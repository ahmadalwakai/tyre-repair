'use client';
import { Accordion, Box, Text } from '@chakra-ui/react';
import { SectionShell } from '@/components/ui/SectionShell';
import { HOME_FAQS } from '@/lib/landing/home-faqs';

export function FaqSection() {
  return (
    <SectionShell
      id="faq"
      eyebrow="FAQ"
      title="Frequently asked questions"
      description="Quick answers about emergency callouts, stock, and payments."
    >
      <Box
        maxW="3xl"
        mx="auto"
        p={{ base: '4', md: '6' }}
        borderRadius="lg"
        borderWidth="1px"
        borderColor="accent.neon"
        bg="bg.canvas"
        boxShadow="0 0 0 1px rgba(240,24,37,0.35), 0 0 22px rgba(240,24,37,0.25), inset 0 0 14px rgba(240,24,37,0.07)"
      >
        <Accordion.Root collapsible multiple={false}>
          {HOME_FAQS.map((f) => (
            <Accordion.Item
              key={f.id}
              value={f.id}
              borderBottomWidth="1px"
              borderColor="border.subtle"
            >
              <Accordion.ItemTrigger
                py="4"
                _hover={{ color: 'accent.neon' }}
                color="fg.default"
              >
                <Box flex="1" textAlign="left" fontWeight="600" fontSize={{ base: 'md', md: 'lg' }}>
                  {f.question}
                </Box>
                <Accordion.ItemIndicator color="accent.neon" />
              </Accordion.ItemTrigger>
              <Accordion.ItemContent>
                <Accordion.ItemBody pb="5">
                  <Text color="fg.muted" fontSize="sm">
                    {f.answer}
                  </Text>
                </Accordion.ItemBody>
              </Accordion.ItemContent>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </Box>
    </SectionShell>
  );
}

export default FaqSection;
