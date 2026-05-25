'use client';
import { useState } from 'react';
import { HStack, Stack, Text } from '@chakra-ui/react';
import { GoldButton } from '@/components/ui/GoldButton';
import { LocationMethodCard } from './LocationMethodCard';
import { AddressAutocomplete } from './AddressAutocomplete';
import { CurrentLocationCard } from './CurrentLocationCard';
import { LocationConfidenceBanner } from '@/components/mobile/LocationConfidenceBanner';
import { RoadsideSafetyChip } from '@/components/mobile/RoadsideSafetyChip';
import type {
  AddressData,
  CapturedLocation,
  ManualAddressInput,
} from '@/types/quote';

export interface LocationCaptureStepProps {
  initial: AddressData | null;
  onContinue: (address: AddressData) => void;
}

interface CoverageResponse {
  covered: boolean;
  area?: 'glasgow' | 'edinburgh' | null;
  normalizedPostcode?: string;
  error?: string;
  code?: string;
}

const NOTIFY_MAILTO = `mailto:hello@tyrerepair.uk?subject=${encodeURIComponent(
  'Notify me when my area is covered',
)}`;

async function checkCoverage(postcode: string): Promise<{
  covered: boolean;
  error: string | null;
}> {
  try {
    const res = await fetch('/api/coverage/check', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ postcode }),
    });
    const data = (await res.json().catch(() => ({}))) as CoverageResponse;
    if (!res.ok) {
      return { covered: false, error: data.error ?? 'Could not check coverage.' };
    }
    return { covered: Boolean(data.covered), error: null };
  } catch {
    return { covered: false, error: 'Network error while checking coverage.' };
  }
}

export function LocationCaptureStep({ initial, onContinue }: LocationCaptureStepProps) {
  const [pending, setPending] = useState(false);
  const [coverageError, setCoverageError] = useState<string | null>(null);
  const [outOfArea, setOutOfArea] = useState(false);

  async function handleAddress(address: ManualAddressInput): Promise<void> {
    if (pending) return;
    setPending(true);
    setCoverageError(null);
    setOutOfArea(false);
    try {
      const { covered, error } = await checkCoverage(address.postcode);
      if (error) {
        setCoverageError(error);
        return;
      }
      if (!covered) {
        setOutOfArea(true);
        return;
      }
      const hasCoords =
        typeof address.latitude === 'number' && typeof address.longitude === 'number';
      const captured: CapturedLocation = {
        method: hasCoords ? 'mapbox_autocomplete' : 'manual_address',
        addressLine1: address.addressLine1,
        city: address.city,
        postcode: address.postcode,
      };
      if (address.addressLine2) captured.addressLine2 = address.addressLine2;
      if (hasCoords) {
        captured.latitude = address.latitude as number;
        captured.longitude = address.longitude as number;
      }
      if (address.mapboxPlaceId) captured.mapboxPlaceId = address.mapboxPlaceId;
      onContinue(captured);
    } finally {
      setPending(false);
    }
  }

  async function handleCurrentLocation(loc: CapturedLocation): Promise<void> {
    if (pending) return;
    if (!loc.postcode) {
      setCoverageError(
        'We could not read your postcode from your location. Please enter it manually below.',
      );
      return;
    }
    setPending(true);
    setCoverageError(null);
    setOutOfArea(false);
    try {
      const { covered, error } = await checkCoverage(loc.postcode);
      if (error) {
        setCoverageError(error);
        return;
      }
      if (!covered) {
        setOutOfArea(true);
        return;
      }
      onContinue(loc);
    } finally {
      setPending(false);
    }
  }

  return (
    <Stack gap="4">
      <Text color="fg.muted" fontSize="sm">
        Tell us where the mobile tyre fitter should come. We never ask for a date or
        time — we dispatch as soon as possible.
      </Text>

      {initial && <LocationConfidenceBanner location={initial} />}

      <RoadsideSafetyChip />

      <Stack gap="4">
        <LocationMethodCard
          title="Use current location"
          description="Use your phone or browser location to help us find you faster."
        >
          <CurrentLocationCard onConfirm={handleCurrentLocation} />
        </LocationMethodCard>

        <LocationMethodCard
          title="Enter address manually"
          description="Type the address or postcode where you need us to come."
        >
          {(() => {
            const initAddr =
              initial?.method === 'manual_address'
                ? {
                    ...(initial.addressLine1 ? { addressLine1: initial.addressLine1 } : {}),
                    ...(initial.addressLine2 ? { addressLine2: initial.addressLine2 } : {}),
                    ...(initial.city ? { city: initial.city } : {}),
                    ...(initial.postcode ? { postcode: initial.postcode } : {}),
                  }
                : null;
            return (
              <AddressAutocomplete
                {...(initAddr ? { initial: initAddr } : {})}
                onSubmit={handleAddress}
              />
            );
          })()}
        </LocationMethodCard>
      </Stack>

      {pending && (
        <Text color="fg.muted" fontSize="sm" role="status">
          Checking your area…
        </Text>
      )}

      {coverageError && (
        <Stack
          gap="1"
          p={{ base: '3', md: '4' }}
          borderRadius="md"
          borderWidth="1px"
          borderColor="border.subtle"
          bg="bg.surface"
          role="alert"
        >
          <Text fontFamily="heading" color="accent.neon" fontSize="sm">
            Could not check your area
          </Text>
          <Text color="fg.muted" fontSize="xs">
            {coverageError} Please try again, or call us if it keeps happening.
          </Text>
        </Stack>
      )}

      {outOfArea && (
        <Stack
          gap="2"
          p={{ base: '3', md: '4' }}
          borderRadius="md"
          borderWidth="1px"
          borderColor="border.gold"
          bg="bg.surface"
          role="alert"
        >
          <Text fontFamily="heading" color="accent.neon" fontSize="sm">
            We don&apos;t cover this area yet
          </Text>
          <Text color="fg.muted" fontSize="xs">
            We&apos;re currently dispatching in Glasgow and Edinburgh. We&apos;re
            expanding fast — leave your details and we&apos;ll let you know as soon as
            we reach you.
          </Text>
          <HStack gap="3" wrap="wrap">
            <GoldButton href={NOTIFY_MAILTO} variant="solid" size="sm">
              Notify me when available
            </GoldButton>
          </HStack>
        </Stack>
      )}
    </Stack>
  );
}
