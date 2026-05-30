'use client';
import { useCallback, useState } from 'react';
import { Box, HStack, Stack, Text } from '@chakra-ui/react';
import { GoldButton } from '@/components/ui/GoldButton';
import { PulseIcon, type PulseIconState } from '@/components/motion/PulseIcon';
import type { CapturedLocation } from '@/types/quote';

export interface CurrentLocationCardProps {
  /** Called when the customer confirms the resolved location. */
  onConfirm: (location: CapturedLocation) => void;
  /** Optional escape hatch: scroll/focus the manual entry card. */
  onUseManualInstead?: () => void;
}

interface ResolvedAddress {
  latitude: number;
  longitude: number;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postcode: string | null;
  country: string | null;
  formattedAddress: string;
}

type Status = 'idle' | 'locating' | 'resolving' | 'resolved' | 'error';

interface ErrorState {
  kind: 'permission_denied' | 'unavailable' | 'timeout' | 'unsupported' | 'reverse_failed';
  message: string;
}

const ERROR_COPY: Record<ErrorState['kind'], string> = {
  permission_denied:
    'Location access was blocked by your browser. Please allow access and try again, or enter your address manually.',
  unavailable:
    'We could not get your current location. You can try again or enter your address manually.',
  timeout:
    'We could not get your current location. You can try again or enter your address manually.',
  unsupported:
    'Your browser does not support live location. Please enter your address manually.',
  reverse_failed:
    'We could not look up your address, but your coordinates were captured. The fitter may call to confirm the exact spot.',
};

// Simple inline SVG so we don't pull a new icon library.
function GpsIcon({ size = 28 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="8" />
      <line x1="12" y1="2" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="2" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
    </svg>
  );
}

export function CurrentLocationCard({
  onConfirm,
  onUseManualInstead,
}: CurrentLocationCardProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<ErrorState | null>(null);
  const [address, setAddress] = useState<ResolvedAddress | null>(null);
  const [lastCoords, setLastCoords] = useState<{ latitude: number; longitude: number } | null>(
    null,
  );

  const pulseState: PulseIconState =
    status === 'locating' || status === 'resolving'
      ? 'loading'
      : status === 'resolved'
      ? 'success'
      : status === 'error'
      ? 'error'
      : 'idle';

  const handleStart = useCallback(async () => {
    setError(null);
    setAddress(null);

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('error');
      setError({ kind: 'unsupported', message: ERROR_COPY.unsupported });
      return;
    }

    setStatus('locating');

    const position = await new Promise<GeolocationPosition | ErrorState>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        (err) => {
          let kind: ErrorState['kind'] = 'unavailable';
          if (err.code === err.PERMISSION_DENIED) kind = 'permission_denied';
          else if (err.code === err.POSITION_UNAVAILABLE) kind = 'unavailable';
          else if (err.code === err.TIMEOUT) kind = 'timeout';
          resolve({ kind, message: ERROR_COPY[kind] });
        },
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
      );
    });

    if (!('coords' in position)) {
      setStatus('error');
      setError(position);
      return;
    }

    setLastCoords({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    });

    setStatus('resolving');
    try {
      const res = await fetch('/api/location/reverse-geocode', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      });
      if (!res.ok) {
        setStatus('error');
        setError({ kind: 'reverse_failed', message: ERROR_COPY.reverse_failed });
        return;
      }
      const data = (await res.json()) as { success?: boolean; location?: ResolvedAddress };
      if (!data.success || !data.location) {
        setStatus('error');
        setError({ kind: 'reverse_failed', message: ERROR_COPY.reverse_failed });
        return;
      }
      setAddress(data.location);
      setStatus('resolved');
    } catch {
      setStatus('error');
      setError({ kind: 'reverse_failed', message: ERROR_COPY.reverse_failed });
    }
  }, []);

  const handleConfirm = () => {
    if (!address) return;
    const captured: CapturedLocation = {
      method: 'browser_geolocation',
      latitude: address.latitude,
      longitude: address.longitude,
      ...(address.addressLine1 ? { addressLine1: address.addressLine1 } : {}),
      ...(address.addressLine2 ? { addressLine2: address.addressLine2 } : {}),
      ...(address.city ? { city: address.city } : {}),
      ...(address.postcode ? { postcode: address.postcode } : {}),
      ...(address.country ? { country: address.country } : {}),
    };
    onConfirm(captured);
  };

  const idleButtonLabel = 'Use current location';
  const loadingButtonLabel =
    status === 'locating' ? 'Finding your location…' : 'Confirming address…';
  const isBusy = status === 'locating' || status === 'resolving';

  return (
    <Stack
      gap="3"
      p={{ base: '4', md: '5' }}
      borderRadius="lg"
      borderWidth="1px"
      borderColor="border.gold"
      bg="bg.surface"
      position="relative"
      boxShadow="0 0 0 1px rgba(255,215,0,0.15)"
    >
      {/* Recommended ribbon */}
      <Text
        position="absolute"
        top="-10px"
        left="16px"
        bg="accent.neon"
        color="black"
        fontSize="xs"
        fontFamily="heading"
        fontWeight="700"
        px="2"
        py="1"
        borderRadius="md"
        letterSpacing="0.05em"
        textTransform="uppercase"
      >
        Recommended
      </Text>

      <HStack align="center" gap="4">
        <PulseIcon state={pulseState} size={56} ariaLabel="GPS location indicator">
          <GpsIcon size={28} />
        </PulseIcon>
        <Stack gap="1" flex="1">
          <Text fontFamily="heading" fontSize="md" color="fg.default">
            Use current location
          </Text>
          <Text color="fg.muted" fontSize="sm">
            The fastest option in an emergency. We detect your current
            position and turn it into an address for your quote.
          </Text>
        </Stack>
      </HStack>

      {status !== 'resolved' && (
        <Stack gap="2">
          <GoldButton
            onClick={() => {
              if (isBusy) return;
              void handleStart();
            }}
            variant="solid"
            size="md"
          >
            {isBusy ? loadingButtonLabel : idleButtonLabel}
          </GoldButton>

          {status === 'idle' && (
            <Text color="fg.muted" fontSize="xs">
              Fastest in an emergency.
            </Text>
          )}

          {status === 'locating' && (
            <Text color="fg.muted" fontSize="xs" role="status">
              Please allow location access in your browser.
            </Text>
          )}

          {status === 'resolving' && (
            <Text color="fg.muted" fontSize="xs" role="status">
              Looking up your address…
            </Text>
          )}
        </Stack>
      )}

      {status === 'error' && error && (
        <Box
          role="alert"
          borderWidth="1px"
          borderColor="red.400"
          bg="rgba(220,38,38,0.08)"
          color="red.200"
          borderRadius="md"
          p="3"
        >
          <Text fontSize="sm">{error.message}</Text>
          {error.kind === 'reverse_failed' && lastCoords && (
            <Stack gap="2" mt="3">
              <Text color="fg.muted" fontSize="xs">
                We have your GPS coordinates and can dispatch using them. Our driver will see your
                location on the map.
              </Text>
              <GoldButton
                onClick={() => {
                  onConfirm({
                    method: 'browser_geolocation',
                    latitude: lastCoords.latitude,
                    longitude: lastCoords.longitude,
                    addressLine1: 'GPS location shared',
                  });
                }}
                variant="solid"
                size="sm"
              >
                Use GPS location
              </GoldButton>
            </Stack>
          )}
        </Box>
      )}

      {status === 'resolved' && address && (
        <Stack
          gap="3"
          borderWidth="1px"
          borderColor="border.gold"
          borderRadius="md"
          bg="bg.canvas"
          p="3"
        >
          <Text fontFamily="heading" color="accent.neon" fontSize="sm">
            We found your location
          </Text>
          <Stack gap="0">
            {address.addressLine1 && (
              <Text color="fg.default" fontSize="sm">
                {address.addressLine1}
              </Text>
            )}
            {address.addressLine2 && (
              <Text color="fg.default" fontSize="sm">
                {address.addressLine2}
              </Text>
            )}
            {address.city && (
              <Text color="fg.muted" fontSize="sm">
                {address.city}
              </Text>
            )}
            {address.postcode && (
              <Text color="fg.muted" fontSize="sm">
                {address.postcode}
              </Text>
            )}
            {!address.addressLine1 && !address.city && !address.postcode && (
              <Text color="fg.muted" fontSize="sm">
                {address.formattedAddress}
              </Text>
            )}
          </Stack>
          <HStack gap="3" wrap="wrap">
            <GoldButton onClick={handleConfirm} variant="solid" size="sm">
              Use my current location
            </GoldButton>
            <GoldButton
              onClick={() => {
                setStatus('idle');
                setAddress(null);
              }}
              variant="outline"
              size="sm"
            >
              Try again
            </GoldButton>
            {onUseManualInstead && (
              <GoldButton
                onClick={onUseManualInstead}
                variant="ghost"
                size="sm"
              >
                Search for an address instead
              </GoldButton>
            )}
          </HStack>
        </Stack>
      )}
    </Stack>
  );
}
