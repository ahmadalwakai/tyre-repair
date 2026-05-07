'use client';
import { useId, useState } from 'react';
import { Field, HStack, Input, Stack, Text } from '@chakra-ui/react';
import { GoldButton } from '@/components/ui/GoldButton';

type Status = 'idle' | 'submitting' | 'sent' | 'error';

export interface SaveProgressCardProps {
  /** Page identifier sent with the request, e.g. 'quote.tyre'. */
  sourcePage: string;
  /** Optional pre-fill for the tyre problem type. */
  tyreProblemType?:
    | 'PUNCTURE_OR_FLAT'
    | 'DAMAGED_OR_BLOWN_OUT'
    | 'SLOW_PRESSURE_LOSS'
    | 'NEEDS_REPLACEMENT'
    | 'NOT_SURE'
    | null;
  /** Vehicle reg, included in the message field for admin context. */
  vehicleRegistration?: string | null;
}

/**
 * Small phone-first lead capture shown mid-funnel. If the customer abandons
 * the quote later, the admin still has a number to call. Posts to the
 * existing /api/callback-requests endpoint with source='QUOTE_PROGRESS_SAVE'
 * so it appears in the admin Action Queue alongside other callback leads.
 */
export function SaveProgressCard({
  sourcePage,
  tyreProblemType,
  vehicleRegistration,
}: SaveProgressCardProps) {
  const phoneId = useId();
  const nameId = useId();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isPhoneValid = (() => {
    const trimmed = phone.trim();
    if (!trimmed) return false;
    const digits = trimmed.replace(/\D/g, '');
    return digits.length >= 9 && digits.length <= 15;
  })();

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setErrorMessage(null);
    if (!isPhoneValid) {
      setErrorMessage('Please enter a valid mobile number.');
      return;
    }
    setStatus('submitting');
    try {
      const message = vehicleRegistration
        ? `Saved progress mid-quote. Vehicle: ${vehicleRegistration}.`
        : 'Saved progress mid-quote.';
      const res = await fetch('/api/callback-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim(),
          fullName: name.trim() || undefined,
          tyreProblemType: tyreProblemType ?? undefined,
          sourcePage,
          source: 'QUOTE_PROGRESS_SAVE',
          message,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setErrorMessage(data.error ?? 'Could not save your progress. Please try again.');
        setStatus('error');
        return;
      }
      setStatus('sent');
    } catch {
      setErrorMessage('Could not reach the server. Please try again.');
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <Stack
        gap="1"
        p={{ base: '3', md: '4' }}
        borderRadius="md"
        borderWidth="1px"
        borderColor="border.gold"
        bg="bg.surface"
      >
        <Text fontFamily="heading" color="accent.neon" fontSize="sm">
          Got your number
        </Text>
        <Text color="fg.muted" fontSize="xs">
          We&apos;ll call you back if anything goes wrong with your quote. Continue below
          to finish in your own time.
        </Text>
      </Stack>
    );
  }

  return (
    <Stack
      as="form"
      onSubmit={onSubmit}
      gap="3"
      p={{ base: '3', md: '4' }}
      borderRadius="md"
      borderWidth="1px"
      borderColor="border.subtle"
      bg="bg.surface"
    >
      <Stack gap="1">
        <Text fontFamily="heading" fontSize="sm" color="fg">
          Save your progress
        </Text>
        <Text color="fg.muted" fontSize="xs">
          Drop your number and we&apos;ll hold this quote. If you get stuck, we&apos;ll
          call you back fast.
        </Text>
      </Stack>
      <HStack gap="2" align="end" flexWrap="wrap">
        <Field.Root flex="1" minW="180px">
          <Field.Label htmlFor={phoneId} fontSize="xs">
            Mobile number
          </Field.Label>
          <Input
            id={phoneId}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="07…"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={status === 'submitting'}
          />
        </Field.Root>
        <Field.Root flex="1" minW="160px">
          <Field.Label htmlFor={nameId} fontSize="xs">
            Name (optional)
          </Field.Label>
          <Input
            id={nameId}
            type="text"
            autoComplete="name"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={status === 'submitting'}
          />
        </Field.Root>
      </HStack>
      {errorMessage && (
        <Text color="red.400" fontSize="xs">
          {errorMessage}
        </Text>
      )}
      <GoldButton type="submit" disabled={!isPhoneValid || status === 'submitting'}>
        {status === 'submitting' ? 'Saving…' : 'Save my progress'}
      </GoldButton>
      <Text color="fg.muted" fontSize="2xs">
        We use your number only to contact you about this quote. Reply STOP to opt out
        of any future messages.
      </Text>
    </Stack>
  );
}
