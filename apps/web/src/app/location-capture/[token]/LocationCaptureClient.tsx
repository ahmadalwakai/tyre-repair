'use client';
import { useEffect, useRef, useState } from 'react';
import { Box, HStack, Stack, Text } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { GoldButton } from '@/components/ui/GoldButton';

export interface LocationCaptureClientProps {
  token: string;
}

interface ResolveResponse {
  locationId: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  createdAt: string;
}

type Status =
  | { kind: 'idle' }
  | { kind: 'requesting' }
  | { kind: 'sending'; latitude: number; longitude: number; accuracyMeters: number | null }
  | { kind: 'done'; latitude: number; longitude: number; accuracyMeters: number | null }
  | { kind: 'error'; message: string };

const pulse = keyframes`
  0% { transform: scale(1); opacity: 0.85; }
  70% { transform: scale(2.2); opacity: 0; }
  100% { transform: scale(2.2); opacity: 0; }
`;

const slide = keyframes`
  0% { left: -40%; }
  100% { left: 100%; }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

export function LocationCaptureClient({ token }: LocationCaptureClientProps) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const cancelledRef = useRef(false);

  useEffect(
    () => () => {
      cancelledRef.current = true;
    },
    [],
  );

  const handleShare = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus({ kind: 'error', message: 'Geolocation is not supported on this device.' });
      return;
    }
    setStatus({ kind: 'requesting' });
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (cancelledRef.current) return;
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const acc = position.coords.accuracy ?? null;
        setStatus({ kind: 'sending', latitude: lat, longitude: lng, accuracyMeters: acc });
        try {
          const res = await fetch('/api/location/resolve', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ token, latitude: lat, longitude: lng, accuracyMeters: acc }),
          });
          const data: ResolveResponse | { error: string } = await res.json();
          if (cancelledRef.current) return;
          if (!res.ok) {
            setStatus({
              kind: 'error',
              message: (data as { error: string }).error || 'Could not save location.',
            });
            return;
          }
          setStatus({ kind: 'done', latitude: lat, longitude: lng, accuracyMeters: acc });
        } catch {
          if (cancelledRef.current) return;
          setStatus({ kind: 'error', message: 'Could not send your location. Please try again.' });
        }
      },
      (err) => {
        if (cancelledRef.current) return;
        const msg =
          err.code === err.PERMISSION_DENIED
            ? 'Location permission was denied. Please allow location access in your browser settings and try again.'
            : err.code === err.POSITION_UNAVAILABLE
              ? 'Could not determine your location. Try moving to an area with better signal.'
              : err.code === err.TIMEOUT
                ? 'Timed out waiting for your location. Please try again.'
                : err.message || 'Could not get your location.';
        setStatus({ kind: 'error', message: msg });
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  };

  if (status.kind === 'done') {
    return (
      <Stack gap="3" align="center" textAlign="center">
        <CheckmarkBadge />
        <Text color="accent.neon" fontWeight="700" fontSize="lg">
          Location shared
        </Text>
        <Text color="fg.muted" fontSize="sm">
          Thanks — we&apos;ve got your location. Our team is on it and will be in touch shortly.
          You can close this page.
        </Text>
        {status.accuracyMeters ? (
          <Text color="fg.muted" fontSize="xs">
            Accuracy: ±{Math.round(status.accuracyMeters)} m
          </Text>
        ) : null}
      </Stack>
    );
  }

  if (status.kind === 'requesting' || status.kind === 'sending') {
    return (
      <Stack gap="4" align="center" textAlign="center">
        <PulseDot />
        <Text color="accent.neon" fontWeight="600">
          {status.kind === 'requesting' ? 'Getting your location…' : 'Sending to our team…'}
        </Text>
        <Text color="fg.muted" fontSize="sm">
          {status.kind === 'requesting'
            ? 'If your browser asks for permission, please tap "Allow". Keep this page open.'
            : 'Almost done — locking in your coordinates so we can dispatch the nearest fitter.'}
        </Text>
        <ProgressBar />
      </Stack>
    );
  }

  return (
    <Stack gap="3">
      <HStack gap="3" align="center">
        <Box fontSize="2xl">📍</Box>
        <Text color="fg.muted" fontSize="sm">
          Tap below — your phone will ask for permission, then send your exact location to our
          dispatch team. Takes about 5 seconds.
        </Text>
      </HStack>
      <GoldButton onClick={handleShare} variant="solid">
        Share my location
      </GoldButton>
      {status.kind === 'error' && (
        <Box
          borderWidth="1px"
          borderColor="border.gold"
          bg="bg.surface"
          borderRadius="md"
          px="3"
          py="2"
        >
          <Text color="fg.muted" fontSize="sm">
            {status.message}
          </Text>
        </Box>
      )}
    </Stack>
  );
}

/* --------------------------------- Visuals --------------------------------- */

function PulseDot() {
  return (
    <Box position="relative" w="64px" h="64px">
      <Box
        position="absolute"
        inset="0"
        borderRadius="full"
        borderWidth="2px"
        borderColor="accent.neon"
        animation={`${pulse} 1.6s ease-out infinite`}
      />
      <Box
        position="absolute"
        inset="0"
        borderRadius="full"
        borderWidth="2px"
        borderColor="accent.neon"
        animation={`${pulse} 1.6s ease-out 0.8s infinite`}
      />
      <Box
        position="absolute"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        w="24px"
        h="24px"
        borderRadius="full"
        bg="accent.neon"
        boxShadow="0 0 16px rgba(220, 38, 38, 0.6)"
      />
    </Box>
  );
}

function ProgressBar() {
  return (
    <Box w="100%" h="3px" bg="bg.surface" borderRadius="full" overflow="hidden" position="relative">
      <Box
        position="absolute"
        top="0"
        left="-40%"
        w="40%"
        h="100%"
        bgGradient="linear(to-r, transparent, accent.neon, transparent)"
        animation={`${slide} 1.4s ease-in-out infinite`}
      />
    </Box>
  );
}

function CheckmarkBadge() {
  return (
    <Box position="relative" w="72px" h="72px">
      <Box
        position="absolute"
        inset="0"
        borderRadius="full"
        bg="rgba(34,197,94,0.15)"
        borderWidth="2px"
        borderColor="rgba(34,197,94,0.6)"
        animation={`${spin} 8s linear infinite`}
      />
      <Box
        position="absolute"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        fontSize="3xl"
      >
        ✅
      </Box>
    </Box>
  );
}
