import React from 'react';
import { Image, Linking, Platform, Pressable, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import { buildStaticMapUrl, hasMapboxToken } from '@/lib/mapbox';

export interface MapPin {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
  /** Brand color override for pin. */
  color?: string;
}

interface Props {
  pins: MapPin[];
  /** When provided, draws a workshop pin and (optionally) a line to the first customer pin. */
  workshop?: { latitude: number; longitude: number } | null;
  height?: number;
  /** Tap pin to open in external Maps app. */
  openInMapsOnPress?: boolean;
}

/**
 * Interactive Google Maps view (Android/iOS). On web falls back to the
 * existing Mapbox static-image preview so the screen still renders.
 */
export function InteractiveMapView({
  pins,
  workshop = null,
  height = 320,
  openInMapsOnPress = true,
}: Props): React.JSX.Element | null {
  if (pins.length === 0 && !workshop) return null;

  if (Platform.OS === 'web') {
    return <StaticFallback pins={pins} workshop={workshop} height={height} />;
  }

  const region = computeRegion(pins, workshop);

  return (
    <View style={{ width: '100%', height, borderRadius: 8, overflow: 'hidden' }}>
      <MapView
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={{ width: '100%', height: '100%' }}
        initialRegion={region}
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
      >
        {workshop ? (
          <Marker
            coordinate={{ latitude: workshop.latitude, longitude: workshop.longitude }}
            title="Workshop"
            pinColor="#ffffff"
          />
        ) : null}
        {pins.map((p) => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.latitude, longitude: p.longitude }}
            {...(p.title !== undefined ? { title: p.title } : {})}
            pinColor={p.color ?? '#E30613'}
            {...(openInMapsOnPress
              ? {
                  onPress: () => {
                    const url = Platform.select({
                      ios: `maps:0,0?q=${p.latitude},${p.longitude}`,
                      android: `geo:0,0?q=${p.latitude},${p.longitude}(${encodeURIComponent(p.title ?? 'Customer')})`,
                    });
                    if (url) void Linking.openURL(url);
                  },
                }
              : {})}
          />
        ))}
      </MapView>
    </View>
  );
}

function computeRegion(pins: MapPin[], workshop: Props['workshop']): Region {
  const all: { latitude: number; longitude: number }[] = [...pins];
  if (workshop) all.push(workshop);
  if (all.length === 0) {
    return { latitude: 51.5074, longitude: -0.1278, latitudeDelta: 0.5, longitudeDelta: 0.5 };
  }
  const lats = all.map((p) => p.latitude);
  const lngs = all.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const padLat = Math.max(0.01, (maxLat - minLat) * 1.6);
  const padLng = Math.max(0.01, (maxLng - minLng) * 1.6);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: padLat,
    longitudeDelta: padLng,
  };
}

function StaticFallback({
  pins,
  workshop,
  height,
}: {
  pins: MapPin[];
  workshop: Props['workshop'];
  height: number;
}): React.JSX.Element {
  const first = pins[0];
  if (!hasMapboxToken() || !first || !workshop) {
    return (
      <View
        style={{
          width: '100%',
          height,
          borderRadius: 8,
          backgroundColor: '#1A1A22',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#9CA3AF' }}>Map unavailable</Text>
      </View>
    );
  }
  const url = buildStaticMapUrl({
    customer: { latitude: first.latitude, longitude: first.longitude },
    workshop,
    width: 800,
    height,
    drawLine: true,
  });
  if (!url) return <View style={{ height }} />;
  return (
    <Pressable onPress={() => void Linking.openURL(url)}>
      <Image source={{ uri: url }} style={{ width: '100%', height, borderRadius: 8 }} resizeMode="cover" />
    </Pressable>
  );
}
