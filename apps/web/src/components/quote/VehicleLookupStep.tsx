'use client';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { chakra, Field, Flex, HStack, Input, Stack, Text } from '@chakra-ui/react';
import { GoldButton } from '@/components/ui/GoldButton';
import { vehicleLookupSchema } from '@/lib/quote/validation';
import { COMMON_TYRE_SIZES } from '@/lib/quote/tyres';
import { formatRegistrationDisplay } from '@/lib/quote/vehicle';
import { QuoteErrorState } from './QuoteErrorState';
import type { VehicleLookupResult, VehicleSelection } from '@/types/quote';

export interface VehicleLookupStepProps {
  initial: VehicleSelection | null;
  onContinue: (vehicle: VehicleSelection) => void;
}

interface ApiError {
  error: string;
  code?: string;
}

const ChakraSelect = chakra('select');
const ChakraForm = chakra('form');

export function VehicleLookupStep({ initial, onContinue }: VehicleLookupStepProps) {
  const [registration, setRegistration] = useState<string>(initial?.registration ?? '');
  const [regError, setRegError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lookup, setLookup] = useState<VehicleLookupResult | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualSize, setManualSize] = useState<string>(initial?.manualTyreSize ?? '');
  const [manualMake, setManualMake] = useState<string>(initial?.make ?? '');
  const [manualModel, setManualModel] = useState<string>(initial?.model ?? '');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsed = vehicleLookupSchema.safeParse({ registration });
    if (!parsed.success) {
      setRegError(parsed.error.issues[0]?.message ?? 'Enter a valid registration');
      return;
    }
    setRegError(null);
    setLoading(true);
    setError(null);
    setLookup(null);
    try {
      const res = await fetch('/api/vehicle/lookup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const data: VehicleLookupResult | ApiError = await res.json();
      if (!res.ok) {
        const err = data as ApiError;
        // If the lookup service is not configured on this environment,
        // silently switch the user to manual entry instead of showing
        // a confusing technical error.
        if (err.code === 'lookup_unavailable') {
          setManualMode(true);
          setError(null);
          return;
        }
        if (err.code === 'not_found') {
          setError(
            'We could not find that registration with DVLA. Check the plate or continue without it.',
          );
          return;
        }
        setError(err.error || 'Vehicle lookup failed.');
        return;
      }
      setLookup(data as VehicleLookupResult);
    } catch {
      setError('Could not reach vehicle service. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUseLookup = () => {
    if (!lookup) return;
    onContinue({
      registration: lookup.registration,
      make: lookup.make,
      model: lookup.model,
      year: lookup.yearOfManufacture,
      manualTyreSize: null,
    });
  };

  const handleSkipManual = () => {
    if (!manualSize) {
      setError('Choose a tyre size to continue.');
      return;
    }
    onContinue({
      registration: null,
      make: manualMake || null,
      model: manualModel || null,
      year: null,
      manualTyreSize: manualSize,
    });
  };

  return (
    <Stack gap="5">
      {!manualMode && (
        <ChakraForm
          onSubmit={handleSubmit}
          p={{ base: '4', md: '5' }}
          borderRadius="lg"
          borderWidth="1px"
          borderColor="border.subtle"
          bg="bg.surface"
        >
          <Stack gap="4">
            <Field.Root invalid={Boolean(regError)}>
              <Field.Label color="fg.default">Vehicle registration</Field.Label>
              <Input
                placeholder="e.g. SK19 ABC"
                size="lg"
                bg="bg.canvas"
                borderColor="border.subtle"
                color="fg.default"
                _placeholder={{ color: 'fg.muted' }}
                autoComplete="off"
                inputMode="text"
                value={registration}
                onChange={(e) => setRegistration(e.target.value)}
              />
              {regError && <Field.ErrorText>{regError}</Field.ErrorText>}
              <Field.HelperText color="fg.muted">
                We use the DVLA service to find your vehicle. No date or time required.
              </Field.HelperText>
            </Field.Root>

            <HStack gap="3" wrap="wrap">
              <GoldButton type="submit" variant="solid">
                {loading ? 'Searching…' : 'Find my vehicle'}
              </GoldButton>
              <GoldButton
                onClick={() => {
                  setManualMode(true);
                  setError(null);
                }}
                variant="ghost"
              >
                Continue without registration
              </GoldButton>
            </HStack>
          </Stack>
        </ChakraForm>
      )}

      {lookup && !manualMode && (
        <Stack
          gap="3"
          p={{ base: '4', md: '5' }}
          borderRadius="lg"
          borderWidth="1px"
          borderColor="border.gold"
          bg="bg.surface"
        >
          <Text fontFamily="heading" color="accent.neon" fontSize="lg">
            {formatRegistrationDisplay(lookup.registration)} ·{' '}
            {[lookup.make, lookup.model].filter(Boolean).join(' ') || 'Vehicle found'}
          </Text>
          <Flex gap="3" color="fg.muted" fontSize="sm" wrap="wrap">
            {lookup.yearOfManufacture && <Text>Year: {lookup.yearOfManufacture}</Text>}
            {lookup.fuelType && <Text>Fuel: {lookup.fuelType}</Text>}
            {lookup.colour && <Text>Colour: {lookup.colour}</Text>}
          </Flex>
          <HStack gap="3" wrap="wrap">
            <GoldButton onClick={handleUseLookup}>Use this vehicle</GoldButton>
            <GoldButton onClick={() => setManualMode(true)} variant="ghost">
              Enter tyre size manually
            </GoldButton>
          </HStack>
        </Stack>
      )}

      {manualMode && (
        <Stack
          gap="4"
          p={{ base: '4', md: '5' }}
          borderRadius="lg"
          borderWidth="1px"
          borderColor="border.subtle"
          bg="bg.surface"
        >
          <Text fontFamily="heading" color="fg.default" fontSize="lg">
            Tell us your tyre size
          </Text>
          <Field.Root>
            <Field.Label color="fg.default">Tyre size</Field.Label>
            <ChakraSelect
              value={manualSize}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setManualSize(e.target.value)}
              bg="bg.canvas"
              color="fg.default"
              borderWidth="1px"
              borderColor="border.subtle"
              borderRadius="md"
              p="3"
              w="full"
            >
              <option value="">Select a tyre size</option>
              {COMMON_TYRE_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </ChakraSelect>
            <Field.HelperText color="fg.muted">
              Size is printed on the side of your tyre, e.g. 205/55R16.
            </Field.HelperText>
          </Field.Root>

          <Stack direction={{ base: 'column', md: 'row' }} gap="3">
            <Field.Root flex="1">
              <Field.Label color="fg.default">Vehicle make (optional)</Field.Label>
              <Input
                value={manualMake}
                onChange={(e) => setManualMake(e.target.value)}
                bg="bg.canvas"
                borderColor="border.subtle"
                color="fg.default"
              />
            </Field.Root>
            <Field.Root flex="1">
              <Field.Label color="fg.default">Vehicle model (optional)</Field.Label>
              <Input
                value={manualModel}
                onChange={(e) => setManualModel(e.target.value)}
                bg="bg.canvas"
                borderColor="border.subtle"
                color="fg.default"
              />
            </Field.Root>
          </Stack>

          <HStack gap="3" wrap="wrap">
            <GoldButton onClick={handleSkipManual}>Continue</GoldButton>
            <GoldButton onClick={() => setManualMode(false)} variant="ghost">
              Back to registration
            </GoldButton>
          </HStack>
        </Stack>
      )}

      {error && <QuoteErrorState message={error} onRetry={() => setError(null)} />}
    </Stack>
  );
}
