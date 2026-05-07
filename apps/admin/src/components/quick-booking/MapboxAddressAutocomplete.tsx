/**
 * Mapbox forward-geocoding autocomplete for UK addresses.
 *
 * Calls the Mapbox Geocoding API directly using EXPO_PUBLIC_MAPBOX_TOKEN.
 * Debounced 350 ms. Tap a result to capture { addressLine, postcode, lat, lng }.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { GoldInput } from '@/components/ui/GoldInput';

const TOKEN = process.env['EXPO_PUBLIC_MAPBOX_TOKEN'] ?? '';

export interface MapboxSuggestion {
  id: string;
  placeName: string;
  postcode: string | null;
  latitude: number;
  longitude: number;
}

interface Props {
  initialQuery?: string;
  onSelect: (suggestion: MapboxSuggestion) => void;
  placeholder?: string;
}

interface MapboxFeature {
  id?: string;
  place_name?: string;
  center?: [number, number];
  properties?: { postcode?: string };
  context?: Array<{ id?: string; text?: string }>;
}

async function searchMapbox(query: string, signal: AbortSignal): Promise<MapboxSuggestion[]> {
  if (!TOKEN || query.trim().length < 3) return [];
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
    `${encodeURIComponent(query.trim())}.json?country=gb&limit=5&autocomplete=true&access_token=${TOKEN}`;
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return [];
    const json = (await res.json()) as { features?: MapboxFeature[] };
    return (json.features ?? [])
      .filter((f) => Array.isArray(f.center) && f.center.length === 2 && f.place_name)
      .map((f) => {
        const center = f.center as [number, number];
        let postcode: string | null = f.properties?.postcode ?? null;
        if (!postcode && f.context) {
          const ctx = f.context.find((c) => c.id?.startsWith('postcode'));
          postcode = ctx?.text ?? null;
        }
        return {
          id: f.id ?? `${center[1]},${center[0]}`,
          placeName: f.place_name ?? '',
          postcode,
          latitude: center[1],
          longitude: center[0],
        };
      });
  } catch {
    return [];
  }
}

export function MapboxAddressAutocomplete(props: Props): React.JSX.Element {
  const [query, setQuery] = useState(props.initialQuery ?? '');
  const [suggestions, setSuggestions] = useState<MapboxSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!TOKEN) return;
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = setTimeout(() => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      void searchMapbox(trimmed, ctrl.signal).then((items) => {
        setSuggestions(items);
        setLoading(false);
      });
    }, 350);
    return (): void => clearTimeout(handle);
  }, [query]);

  const handleSelect = useCallback(
    (s: MapboxSuggestion) => {
      setQuery(s.placeName);
      setSuggestions([]);
      setOpen(false);
      props.onSelect(s);
    },
    [props],
  );

  return (
    <View>
      <GoldInput
        label="Search address or postcode"
        placeholder={props.placeholder ?? 'e.g. G31 1PD or 10 Gateside Street'}
        value={query}
        onChangeText={(t) => {
          setQuery(t);
          setOpen(true);
        }}
        autoCapitalize="characters"
        autoCorrect={false}
      />
      {!TOKEN ? (
        <Text className="text-text-dim text-[10px] mt-1">
          Mapbox token missing — autocomplete disabled. Type the address manually.
        </Text>
      ) : null}
      {open && (loading || suggestions.length > 0) ? (
        <View className="mt-2 rounded-lg border border-border bg-surface overflow-hidden">
          {loading ? (
            <View className="flex-row items-center gap-2 px-3 py-2">
              <ActivityIndicator size="small" />
              <Text className="text-text-muted text-xs">Searching…</Text>
            </View>
          ) : null}
          {suggestions.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => handleSelect(s)}
              className="px-3 py-2.5 border-b border-border/30 active:bg-surfaceMuted"
            >
              <Text className="text-text text-sm" numberOfLines={1}>
                {s.placeName}
              </Text>
              {s.postcode ? (
                <Text className="text-text-muted text-[11px] mt-0.5">{s.postcode}</Text>
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
