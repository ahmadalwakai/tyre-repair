import type { Metadata } from 'next';
import { Box, Container, Heading, Stack, Text } from '@chakra-ui/react';
import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Cancellation Policy | TyreRepair UK',
  description:
    'Cancellation policy for TyreRepair UK emergency mobile tyre service, including how the 15% dispatch deposit is treated.',
};

export default function CancellationPolicyPage() {
  return (
    <Box bg="black" minH="100vh" color="white" py={{ base: 8, md: 16 }}>
      <Container maxW="3xl">
        <Stack gap={6}>
          <Heading as="h1" size="xl" color="accent.solid" fontFamily="heading">
            Cancellation Policy
          </Heading>
          <Text color="gray.300">
            TyreRepair UK provides 24/7 emergency mobile tyre fitting and roadside
            assessment across the UK. Because we begin arranging dispatch the moment
            you book, this policy explains what happens if a booking is cancelled.
          </Text>

          <Stack gap={3}>
            <Heading as="h2" size="md" color="accent.solid">
              Emergency service
            </Heading>
            <Text color="gray.300">
              Our service is on-demand. As soon as you confirm a booking, we begin
              allocating a fitter, preparing stock, and planning the route to your
              vehicle. This activity has a real cost even if the job is later
              cancelled.
            </Text>
          </Stack>

          <Stack gap={3}>
            <Heading as="h2" size="md" color="accent.solid">
              15% dispatch deposit
            </Heading>
            <Text color="gray.300">
              You can choose to pay either the full amount or a 15% dispatch
              deposit at checkout. The dispatch deposit secures the booking and
              starts the dispatch process. The remaining balance is due before the
              job is completed.
            </Text>
            <Text color="gray.300">
              The 15% dispatch deposit is non-refundable once dispatch or work has
              started. &quot;Dispatch started&quot; means we have allocated a
              fitter or our team has begun travelling to your location.
            </Text>
          </Stack>

          <Stack gap={3}>
            <Heading as="h2" size="md" color="accent.solid">
              When you may receive a refund
            </Heading>
            <Text color="gray.300">
              If you cancel before dispatch has started and before any work has
              begun, please contact us as soon as possible and we will review your
              request. Where dispatch has not started, we will normally refund the
              deposit in full. If dispatch has started, the deposit is
              non-refundable.
            </Text>
            <Text color="gray.300">
              If we are unable to attend due to a fault on our side, you will
              receive a full refund.
            </Text>
          </Stack>

          <Stack gap={3}>
            <Heading as="h2" size="md" color="accent.solid">
              Full payments
            </Heading>
            <Text color="gray.300">
              If you paid the full amount and cancel before dispatch has started,
              we will refund the full amount minus the 15% dispatch deposit. If
              dispatch has started or work has begun, refunds may be reduced to
              cover work already carried out, parts ordered, or distance
              travelled.
            </Text>
          </Stack>

          <Stack gap={3}>
            <Heading as="h2" size="md" color="accent.solid">
              Special order tyres
            </Heading>
            <Text color="gray.300">
              Where a tyre is specially ordered for your vehicle, the cost of the
              tyre may be non-refundable once the order has been placed with our
              supplier.
            </Text>
          </Stack>

          <Stack gap={3}>
            <Heading as="h2" size="md" color="accent.solid">
              How to cancel
            </Heading>
            <Text color="gray.300">
              To cancel a booking, please call us on{' '}
              <Text as="span" color="accent.solid" fontWeight="bold">
                {siteConfig.phoneDisplay}
              </Text>{' '}
              or message us on WhatsApp at{' '}
              <Text as="span" color="accent.solid" fontWeight="bold">
                {siteConfig.whatsappDisplay}
              </Text>
              . Please have your tracking ID ready.
            </Text>
          </Stack>

          <Stack gap={3}>
            <Heading as="h2" size="md" color="accent.solid">
              Your statutory rights
            </Heading>
            <Text color="gray.300">
              This policy does not affect your statutory rights under UK consumer
              law. Because our service is an emergency on-demand service requested
              by you and started immediately, the standard 14-day right to cancel
              under the Consumer Contracts Regulations does not normally apply
              once work has started, but we will always treat refund requests
              fairly and in line with the law.
            </Text>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
