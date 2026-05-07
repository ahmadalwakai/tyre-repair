'use client';
import { useState } from 'react';
import { Stack, Text } from '@chakra-ui/react';
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

export function LocationCaptureClient({ token }: LocationCaptureClientProps) {
  const [status, setStatus] = useState<'idle' | 'requesting' | 'sending' | 'done' | 'error'>(
    'idle',
  );
  const [error, setError] = useState<string | null>(null);

  const handleShare = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Geolocation is not supported on this device.');
      setStatus('error');
      return;
    }
    setStatus('requesting');
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setStatus('sending');
        try {
          const res = await fetch('/api/location/resolve', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              token,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracyMeters: position.coords.accuracy,
            }),
          });
          const data: ResolveResponse | { error: string } = await res.json();
          if (!res.ok) {
            setError((data as { error: string }).error || 'Could not save location.');
            setStatus('error');
            return;
          }
          setStatus('done');
        } catch {
          setError('Could not send your location. Please try again.');
          setStatus('error');
        }
      },
      (err) => {
        setError(err.message || 'Permission to share location was denied.');
        setStatus('error');
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  if (status === 'done') {
    return (
      <Text color="accent.neon" fontWeight="600">
        Thanks — your location has been shared. You can close this page.
      </Text>
    );
  }

  return (
    <Stack gap="3">
      <GoldButton onClick={handleShare} variant="solid">
        {status === 'requesting'
          ? 'Waiting for permission…'
          : status === 'sending'
            ? 'Sending…'
            : 'Share my location'}
      </GoldButton>
      {error && (
        <Text color="fg.muted" fontSize="sm">
          {error}
        </Text>
      )}
    </Stack>
  );
}
