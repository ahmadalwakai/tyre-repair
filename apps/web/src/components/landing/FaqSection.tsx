'use client';
import { Accordion, Box, Text } from '@chakra-ui/react';
import { SectionShell } from '@/components/ui/SectionShell';
import type { LandingFaqItem } from '@/types/landing';

const FAQS: readonly LandingFaqItem[] = [
  {
    id: 'coverage',
    question: 'Do you cover my area?',
    answer:
      'TyreRepair UK covers the whole of Scotland from its Glasgow base. The quote flow calculates distance automatically.',
  },
  {
    id: 'later',
    question: 'Can I book for later?',
    answer:
      'The service is built around emergency callouts. The system prices the job for now and does not ask customers to choose a date or time.',
  },
  {
    id: 'stock',
    question: 'What happens if my tyre is not in stock?',
    answer:
      'The site will show "Special order — fitted within 3 working days" before payment.',
  },
  {
    id: 'payments',
    question: 'Can I pay by card?',
    answer:
      'Yes. Secure card payments are handled through Stripe, with supported wallet and 3D Secure options where available.',
  },
  {
    id: 'account',
    question: 'Do I need an account?',
    answer: 'No. The customer flow is guest checkout only.',
  },
  {
    id: 'tracking',
    question: 'Can I track my booking?',
    answer:
      'Yes. Every booking receives a tracking ID and tracking link after confirmation.',
  },
];

export function FaqSection() {
  return (
    <SectionShell
      id="faq"
      eyebrow="FAQ"
      title="Frequently asked questions"
      description="Quick answers about emergency callouts, stock, and payments."
    >
      <Box maxW="3xl" mx="auto">
        <Accordion.Root collapsible multiple={false}>
          {FAQS.map((f) => (
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
