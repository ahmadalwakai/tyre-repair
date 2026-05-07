import React, { useEffect, useState } from 'react';
import { Image, Linking, Text, View } from 'react-native';
import { GoldCard } from '@/components/ui/GoldCard';
import { GoldButton } from '@/components/ui/GoldButton';
import { getMapboxLocation } from '@/lib/api/mapbox-location';
import type { MapboxLocationResponse } from '@/types/command-center';
import { ApiError } from '@/lib/api/client';

const CONFIDENCE_LABEL: Record<MapboxLocationResponse['locationConfidence'], string> = {
  CONFIRMED_ADDRESS: 'Address confirmed',
  GPS_ONLY: 'GPS pin only',
  WEAK_ADDRESS: 'Address only — no GPS pin',
  MISSING_LOCATION: 'No location captured',
};

const CONFIDENCE_COLOR: Record<MapboxLocationResponse['locationConfidence'], string> = {
  CONFIRMED_ADDRESS: 'text-success',
  GPS_ONLY: 'text-warning',
  WEAK_ADDRESS: 'text-warning',
  MISSING_LOCATION: 'text-danger',
};

export function BookingLocationCard({ bookingId }: { bookingId: string }): React.JSX.Element {
  const [data, setData] = useState<MapboxLocationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    getMapboxLocation(bookingId)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : 'Could not load location');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  if (error) {
    return (
      <GoldCard className="mb-3">
        <Text className="text-danger">Location: {error}</Text>
      </GoldCard>
    );
  }
  if (!data) {
    return (
      <GoldCard className="mb-3">
        <Text className="text-text-muted">Loading location…</Text>
      </GoldCard>
    );
  }

  return (
    <GoldCard className="mb-3">
      <Text className={`text-xs uppercase tracking-wide ${CONFIDENCE_COLOR[data.locationConfidence]}`}>
        {CONFIDENCE_LABEL[data.locationConfidence]}
      </Text>
      <Text className="text-text font-semibold mt-1">
        {data.addressLabel ?? 'No address available'}
      </Text>
      {data.coordinates ? (
        <Text className="text-text-dim text-xs mt-1">
          {data.coordinates.lat.toFixed(5)}, {data.coordinates.lng.toFixed(5)}
        </Text>
      ) : null}

      {data.mapPreviewUrl ? (
        <Image
          source={{ uri: data.mapPreviewUrl }}
          style={{ width: '100%', height: 160, borderRadius: 8, marginTop: 12 }}
          resizeMode="cover"
        />
      ) : null}

      {data.warningMessage ? (
        <Text className="text-warning text-xs mt-2">{data.warningMessage}</Text>
      ) : null}

      <View className="flex-row flex-wrap gap-2 mt-3">
        {data.externalNavigationOptions.genericGeoUrl ? (
          <GoldButton
            label="Open in Maps"
            variant="primary"
            onPress={() => {
              void Linking.openURL(data.externalNavigationOptions.genericGeoUrl!);
            }}
          />
        ) : null}
        {data.externalNavigationOptions.mapboxDirectionsUrl ? (
          <GoldButton
            label="Mapbox directions"
            variant="secondary"
            onPress={() => {
              void Linking.openURL(data.externalNavigationOptions.mapboxDirectionsUrl!);
            }}
          />
        ) : null}
      </View>
    </GoldCard>
  );
}
