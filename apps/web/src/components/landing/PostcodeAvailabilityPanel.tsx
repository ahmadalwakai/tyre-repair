'use client';

import { Stack } from '@chakra-ui/react';
import { useState } from 'react';
import type { PostcodeAvailabilityResult } from '@/types/coverage';
import { PostcodeAvailabilityForm } from './PostcodeAvailabilityForm';
import { AvailabilityResultCard } from './AvailabilityResultCard';

export interface PostcodeAvailabilityPanelProps {
  source: string;
  intent?: string;
}

/**
 * Stateful wrapper that pairs the postcode form with its result card.
 *
 * Keeps client-side state local so server-rendered landing pages can drop
 * it in without becoming client components themselves.
 */
export function PostcodeAvailabilityPanel({
  source,
  intent,
}: PostcodeAvailabilityPanelProps): React.ReactNode {
  const [result, setResult] = useState<PostcodeAvailabilityResult | null>(null);

  return (
    <Stack gap="4" w="full" maxW="md">
      <PostcodeAvailabilityForm source={source} {...(intent ? { intent } : {})} onResult={setResult} />
      <AvailabilityResultCard result={result} showEmptyState source={source} />
    </Stack>
  );
}
