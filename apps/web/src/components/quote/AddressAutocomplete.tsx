'use client';
import { useMemo, useState, type ComponentType, type FormEvent, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { Field, Input, Stack, Text } from '@chakra-ui/react';
import { GoldButton } from '@/components/ui/GoldButton';
import type { ManualAddressInput } from '@/types/quote';

export interface AddressAutocompleteProps {
  initial?: Partial<ManualAddressInput>;
  onSubmit: (address: ManualAddressInput) => void;
}

interface MapboxRetrieveFeatureProperties {
  feature_name?: string;
  address_line1?: string;
  address_line2?: string;
  address_level1?: string;
  address_level2?: string;
  address_level3?: string;
  place?: string;
  postcode?: string;
  country?: string;
  mapbox_id?: string;
}

interface MapboxRetrieveFeature {
  properties?: MapboxRetrieveFeatureProperties;
  geometry?: { type?: string; coordinates?: [number, number] };
}

interface MapboxRetrieveResponse {
  features?: MapboxRetrieveFeature[];
}

interface MapboxAddressAutofillProps {
  accessToken: string;
  options?: { country?: string; language?: string };
  onRetrieve?: (res: MapboxRetrieveResponse) => void;
  children: ReactNode;
}

/**
 * `AddressAutofill` from `@mapbox/search-js-react` registers a Lit-based
 * custom element that touches `window` at import time. Load it only on the
 * client to keep SSR safe.
 */
const AddressAutofill = dynamic<MapboxAddressAutofillProps>(
  () =>
    import('@mapbox/search-js-react').then(
      (mod) => mod.AddressAutofill as unknown as ComponentType<MapboxAddressAutofillProps>,
    ),
  { ssr: false },
);

export function AddressAutocomplete({ initial, onSubmit }: AddressAutocompleteProps) {
  const [addressLine1, setAddressLine1] = useState(initial?.addressLine1 ?? '');
  const [addressLine2, setAddressLine2] = useState(initial?.addressLine2 ?? '');
  const [city, setCity] = useState(initial?.city ?? '');
  const [postcode, setPostcode] = useState(initial?.postcode ?? '');
  const [latitude, setLatitude] = useState<number | null>(
    typeof initial?.latitude === 'number' ? initial.latitude : null,
  );
  const [longitude, setLongitude] = useState<number | null>(
    typeof initial?.longitude === 'number' ? initial.longitude : null,
  );
  const [mapboxPlaceId, setMapboxPlaceId] = useState<string | null>(
    initial?.mapboxPlaceId ?? null,
  );
  const [error, setError] = useState<string | null>(null);

  const mapboxToken = useMemo(
    () =>
      (process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ??
        process.env.NEXT_PUBLIC_MAPBOX_TOKEN ??
        '').trim(),
    [],
  );

  const clearGeocode = () => {
    if (latitude != null || longitude != null || mapboxPlaceId) {
      setLatitude(null);
      setLongitude(null);
      setMapboxPlaceId(null);
    }
  };

  const handleRetrieve = (res: MapboxRetrieveResponse) => {
    const feature = res.features?.[0];
    if (!feature) return;
    const props = feature.properties ?? {};
    const line1 = props.address_line1 ?? props.feature_name ?? '';
    const line2 = props.address_line2 ?? '';
    // UK city: prefer address_level2 (post town), fall back to place / level1.
    const cityValue =
      props.address_level2 ?? props.place ?? props.address_level1 ?? '';
    const post = (props.postcode ?? '').toUpperCase();
    const coords = feature.geometry?.coordinates;
    setAddressLine1(line1);
    setAddressLine2(line2);
    setCity(cityValue);
    setPostcode(post);
    if (Array.isArray(coords) && coords.length === 2) {
      setLongitude(coords[0]);
      setLatitude(coords[1]);
    }
    setMapboxPlaceId(props.mapbox_id ?? null);
    setError(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!addressLine1.trim() || !city.trim() || !postcode.trim()) {
      setError('Please fill in address line 1, city and postcode.');
      return;
    }
    setError(null);
    const value: ManualAddressInput = {
      addressLine1: addressLine1.trim(),
      city: city.trim(),
      postcode: postcode.trim(),
    };
    if (addressLine2.trim()) value.addressLine2 = addressLine2.trim();
    if (latitude != null && longitude != null) {
      value.latitude = latitude;
      value.longitude = longitude;
    }
    if (mapboxPlaceId) value.mapboxPlaceId = mapboxPlaceId;
    onSubmit(value);
  };

  const line1Input = (
    <Input
      value={addressLine1}
      onChange={(e) => {
        setAddressLine1(e.target.value);
        // User edited manually after a suggestion → drop stale coords/place id.
        clearGeocode();
      }}
      bg="bg.canvas"
      borderColor="border.subtle"
      color="fg.default"
      autoComplete="address-line1"
      placeholder={mapboxToken ? 'Start typing your address…' : undefined}
    />
  );

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack gap="3">
        <Field.Root>
          <Field.Label color="fg.default">Address line 1</Field.Label>
          {mapboxToken ? (
            <AddressAutofill
              accessToken={mapboxToken}
              options={{ country: 'GB', language: 'en' }}
              onRetrieve={handleRetrieve}
            >
              {line1Input}
            </AddressAutofill>
          ) : (
            line1Input
          )}
        </Field.Root>
        <Field.Root>
          <Field.Label color="fg.default">Address line 2 (optional)</Field.Label>
          <Input
            value={addressLine2}
            onChange={(e) => setAddressLine2(e.target.value)}
            bg="bg.canvas"
            borderColor="border.subtle"
            color="fg.default"
            autoComplete="address-line2"
          />
        </Field.Root>
        <Stack direction={{ base: 'column', sm: 'row' }} gap="3">
          <Field.Root flex="1">
            <Field.Label color="fg.default">City</Field.Label>
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              bg="bg.canvas"
              borderColor="border.subtle"
              color="fg.default"
              autoComplete="address-level2"
            />
          </Field.Root>
          <Field.Root flex="1">
            <Field.Label color="fg.default">Postcode</Field.Label>
            <Input
              value={postcode}
              onChange={(e) => setPostcode(e.target.value.toUpperCase())}
              bg="bg.canvas"
              borderColor="border.subtle"
              color="fg.default"
              autoComplete="postal-code"
            />
          </Field.Root>
        </Stack>
        {error && (
          <Text color="accent.neon" fontSize="sm">
            {error}
          </Text>
        )}
        <GoldButton type="submit" variant="solid">
          Use this address
        </GoldButton>
      </Stack>
    </form>
  );
}
