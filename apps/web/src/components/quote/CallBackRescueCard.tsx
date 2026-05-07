'use client';
import { useId, useState } from 'react';
import { Box, HStack, Input, NativeSelect, Stack, Text, Textarea } from '@chakra-ui/react';
import { GoldButton } from '@/components/ui/GoldButton';

type Status = 'idle' | 'submitting' | 'sent' | 'error';

type ProblemType =
  | 'PUNCTURE_OR_FLAT'
  | 'DAMAGED_OR_BLOWN_OUT'
  | 'SLOW_PRESSURE_LOSS'
  | 'NEEDS_REPLACEMENT'
  | 'NOT_SURE';

const PROBLEM_LABELS: Record<ProblemType, string> = {
  PUNCTURE_OR_FLAT: 'Puncture or flat',
  DAMAGED_OR_BLOWN_OUT: 'Damaged or blown out',
  SLOW_PRESSURE_LOSS: 'Slow pressure loss',
  NEEDS_REPLACEMENT: 'Needs replacement',
  NOT_SURE: 'Not sure',
};

export interface CallBackRescueCardProps {
  /** Page identifier sent with the request, e.g. 'quote.tyre' or 'quote.location'. */
  sourcePage?: string;
  /** Optional pre-fill for the tyre problem type. */
  tyreProblemType?: ProblemType | null;
}

export function CallBackRescueCard({ sourcePage, tyreProblemType }: CallBackRescueCardProps) {
  const phoneId = useId();
  const nameId = useId();
  const messageId = useId();
  const problemId = useId();
  const locationId = useId();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [problem, setProblem] = useState<ProblemType | ''>(tyreProblemType ?? '');
  const [locationLabel, setLocationLabel] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const requestLocation = (): void => {
    setGpsError(null);
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsError('Location is not available in this browser.');
      return;
    }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsBusy(false);
      },
      (err) => {
        setGpsBusy(false);
        setGpsError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission was denied.'
            : 'Could not get your location.',
        );
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  };

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setErrorMessage(null);
    if (!phone.trim() || phone.trim().length < 7) {
      setErrorMessage('Please enter a valid phone number.');
      return;
    }
    setStatus('submitting');
    try {
      const res = await fetch('/api/callback-requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim(),
          fullName: name.trim() || undefined,
          message: message.trim() || undefined,
          tyreProblemType: problem || undefined,
          sourcePage: sourcePage ?? undefined,
          locationLabel: locationLabel.trim() || undefined,
          latitude: coords?.lat,
          longitude: coords?.lng,
        }),
      });
      if (!res.ok) {
        setStatus('error');
        setErrorMessage('Could not send. Please try again.');
        return;
      }
      setStatus('sent');
    } catch {
      setStatus('error');
      setErrorMessage('Could not send. Please try again.');
    }
  };

  if (status === 'sent') {
    return (
      <Stack
        gap="2"
        p={{ base: '4', md: '5' }}
        borderRadius="lg"
        borderWidth="1px"
        borderColor="border.gold"
        bg="bg.surface"
      >
        <Text fontFamily="heading" color="accent.neon" fontSize="lg">
          We&apos;ll call you back
        </Text>
        <Text color="fg.muted" fontSize="sm">
          A team member will phone you on {phone} as soon as possible.
        </Text>
      </Stack>
    );
  }

  return (
    <Stack
      as="form"
      onSubmit={onSubmit}
      gap="3"
      p={{ base: '4', md: '5' }}
      borderRadius="lg"
      borderWidth="1px"
      borderColor="border.subtle"
      bg="bg.surface"
    >
      <Stack gap="1">
        <Text fontFamily="heading" color="accent.neon" fontSize="lg">
          Want us to call you back?
        </Text>
        <Text color="fg.muted" fontSize="sm">
          Leave a number and we&apos;ll phone you. No commitment.
        </Text>
      </Stack>

      <Stack gap="3">
        <Stack gap="1">
          <Text as="span" fontSize="sm" color="fg.muted">
            <label htmlFor={phoneId}>Phone number</label>
          </Text>
          <Input
            id={phoneId}
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="07…"
            bg="bg.canvas"
            borderColor="border.subtle"
          />
        </Stack>
        <Stack gap="1">
          <Text as="span" fontSize="sm" color="fg.muted">
            <label htmlFor={nameId}>Your name (optional)</label>
          </Text>
          <Input
            id={nameId}
            value={name}
            onChange={(e) => setName(e.target.value)}
            bg="bg.canvas"
            borderColor="border.subtle"
          />
        </Stack>
        <Stack gap="1">
          <Text as="span" fontSize="sm" color="fg.muted">
            <label htmlFor={problemId}>What’s wrong? (optional)</label>
          </Text>
          <NativeSelect.Root>
            <NativeSelect.Field
              id={problemId}
              value={problem}
              onChange={(e) => setProblem(e.currentTarget.value as ProblemType | '')}
              bg="bg.canvas"
              borderColor="border.subtle"
            >
              <option value="">Not specified</option>
              {(Object.keys(PROBLEM_LABELS) as ProblemType[]).map((k) => (
                <option key={k} value={k}>
                  {PROBLEM_LABELS[k]}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Stack>
        <Stack gap="1">
          <Text as="span" fontSize="sm" color="fg.muted">
            <label htmlFor={locationId}>Where are you? (optional)</label>
          </Text>
          <Input
            id={locationId}
            value={locationLabel}
            onChange={(e) => setLocationLabel(e.target.value)}
            placeholder="Postcode, road or landmark"
            bg="bg.canvas"
            borderColor="border.subtle"
          />
          <HStack gap="2">
            <GoldButton
              type="button"
              variant="outline"
              size="sm"
              disabled={gpsBusy}
              onClick={requestLocation}
            >
              {gpsBusy
                ? 'Getting location…'
                : coords
                  ? 'Update my location'
                  : 'Use my location'}
            </GoldButton>
            {coords ? (
              <Text fontSize="xs" color="fg.muted">
                Location shared
              </Text>
            ) : null}
          </HStack>
          {gpsError ? (
            <Text fontSize="xs" color="red.300">
              {gpsError}
            </Text>
          ) : null}
        </Stack>
        <Stack gap="1">
          <Text as="span" fontSize="sm" color="fg.muted">
            <label htmlFor={messageId}>Anything we should know? (optional)</label>
          </Text>
          <Textarea
            id={messageId}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            bg="bg.canvas"
            borderColor="border.subtle"
          />
        </Stack>
      </Stack>

      {errorMessage ? (
        <Box
          role="alert"
          borderWidth="1px"
          borderColor="red.400"
          bg="rgba(220,38,38,0.08)"
          color="red.200"
          borderRadius="md"
          p="3"
        >
          <Text fontSize="sm">{errorMessage}</Text>
        </Box>
      ) : null}

      <HStack gap="3">
        <GoldButton type="submit" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Sending…' : 'Request a call back'}
        </GoldButton>
      </HStack>
    </Stack>
  );
}
