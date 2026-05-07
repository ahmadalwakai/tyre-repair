import { Container } from '@chakra-ui/react';
import { PayAdjustmentClient } from '@/components/checkout/PayAdjustmentClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ adjustmentId: string }>;
}

export default async function PayAdjustmentPage({ params }: PageProps) {
  const { adjustmentId } = await params;
  return (
    <Container maxW="3xl" py={{ base: '6', md: '10' }}>
      <PayAdjustmentClient adjustmentId={adjustmentId} />
    </Container>
  );
}
