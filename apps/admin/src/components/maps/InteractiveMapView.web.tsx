import React from 'react';
import { Image, Linking, Pressable, Text, View } from 'react-native';
import { buildStaticMapUrl, hasMapboxToken } from '@/lib/mapbox';

export interface MapPin {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
  color?: string;
}

interface Props {
  pins: MapPin[];
  workshop?: { latitude: number; longitude: number } | null;
  height?: number;
  openInMapsOnPress?: boolean;
}

export function InteractiveMapView({
  pins,
  workshop = null,
  height = 320,
}: Props): React.JSX.Element | null {
  if (pins.length === 0 && !workshop) return null;
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
