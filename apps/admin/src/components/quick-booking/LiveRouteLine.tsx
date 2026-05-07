/**
 * LiveRouteLine — Mapbox static map preview for Quick Booking Step 1.
 *
 * Shows a Mapbox static image with a gold geojson line drawn between the
 * Workshop (Glasgow HQ) and the Customer. Tap to open Google Maps directions.
 * No native maps SDK, no WebView.
 *
 * `expo-location` is NOT installed in apps/admin → we cannot read the admin's
 * live position, so the origin is ALWAYS the workshop. The footnote makes
 * this explicit.
 */
import * as React from 'react';
import { ActivityIndicator, Image, Linking, Pressable, Text, View } from 'react-native';
import { GoldCard } from '@/components/ui/GoldCard';
import { WORKSHOP } from '@/lib/workshop';
import { buildStaticMapUrl, hasMapboxToken } from '@/lib/mapbox';

interface Customer {
  latitude: number;
  longitude: number;
  label?: string;
}

interface RouteIntelLite {
  distanceMiles?: number | null;
  durationMinutes?: number | null;
}

interface Props {
  customer: Customer | null;
  routeIntel?: RouteIntelLite | null;
}

const MAP_HEIGHT = 200;

export function LiveRouteLine({ customer, routeIntel }: Props): React.JSX.Element {
  const [containerWidth, setContainerWidth] = React.useState(0);
  const [imgFailed, setImgFailed] = React.useState(false);

  const mapUrl = React.useMemo(() => {
    if (!customer || containerWidth <= 0) return null;
    return buildStaticMapUrl({
      customer: { latitude: customer.latitude, longitude: customer.longitude },
      workshop: { latitude: WORKSHOP.latitude, longitude: WORKSHOP.longitude },
      width: containerWidth,
      height: MAP_HEIGHT,
      drawLine: true,
    });
  }, [customer, containerWidth]);

  React.useEffect(() => {
    setImgFailed(false);
  }, [mapUrl]);

  const openExternalDirections = React.useCallback(() => {
    if (!customer) return;
    const url =
      `https://www.google.com/maps/dir/?api=1` +
      `&origin=${WORKSHOP.latitude},${WORKSHOP.longitude}` +
      `&destination=${customer.latitude},${customer.longitude}` +
      `&travelmode=driving`;
    void Linking.openURL(url);
  }, [customer]);

  return (
    <GoldCard title="Route preview" icon="🛰️" eyebrow="Glasgow base → customer">
      <View
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        style={{
          width: '100%',
          height: MAP_HEIGHT,
          borderRadius: 10,
          overflow: 'hidden',
          backgroundColor: 'rgba(255,255,255,0.04)',
          borderWidth: 1,
          borderColor: 'rgba(212,175,55,0.25)',
        }}
      >
        {!customer ? (
          <CenteredText text="Waiting for customer location…" />
        ) : !hasMapboxToken() ? (
          <CenteredText text="Map unavailable — EXPO_PUBLIC_MAPBOX_TOKEN is not set." warning />
        ) : !mapUrl ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator />
          </View>
        ) : imgFailed ? (
          <Pressable onPress={openExternalDirections} style={{ flex: 1 }}>
            <CenteredText text="Map failed to load — tap to open in Google Maps." warning />
          </Pressable>
        ) : (
          <Pressable onPress={openExternalDirections} style={{ flex: 1 }}>
            <Image
              source={{ uri: mapUrl }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
              onError={() => setImgFailed(true)}
            />
          </Pressable>
        )}
      </View>

      <View className="flex-row items-center gap-3 mt-2">
        <LegendDot colour="#FFD700" label="Customer" />
        <LegendDot colour="#FFFFFF" label="Base" />
        <View style={{ flex: 1 }} />
        {routeIntel?.distanceMiles != null ? (
          <Text className="text-text-muted text-[11px]">
            {routeIntel.distanceMiles.toFixed(1)} mi
          </Text>
        ) : null}
        {routeIntel?.durationMinutes != null ? (
          <Text className="text-text-muted text-[11px]">
            ~{Math.round(routeIntel.durationMinutes)} min
          </Text>
        ) : null}
      </View>

      <Text className="text-text-dim text-[10px] mt-2">
        Using Glasgow base ({WORKSHOP.postcode}) as route origin. Tap map to open in Google Maps.
      </Text>
    </GoldCard>
  );
}

function LegendDot({ colour, label }: { colour: string; label: string }): React.JSX.Element {
  return (
    <View className="flex-row items-center gap-1.5">
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: colour,
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0.3)',
        }}
      />
      <Text className="text-text-muted text-[10px]">{label}</Text>
    </View>
  );
}

function CenteredText({
  text,
  warning,
}: {
  text: string;
  warning?: boolean;
}): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center px-4">
      <Text
        className={`text-[11px] text-center ${warning ? 'text-warning' : 'text-text-muted'}`}
      >
        {text}
      </Text>
    </View>
  );
}
