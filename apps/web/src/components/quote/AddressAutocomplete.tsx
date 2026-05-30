'use client';
import { useMemo, useState, type ComponentType, type FormEvent, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { Box, Field, Input, Stack, Text } from '@chakra-ui/react';
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
  const hasInitialSelection =
    Boolean(initial?.addressLine1 && initial?.postcode) &&
    typeof initial?.latitude === 'number' &&
    typeof initial?.longitude === 'number';

  const [query, setQuery] = useState(initial?.addressLine1 ?? '');
  const [selected, setSelected] = useState<ManualAddressInput | null>(
    hasInitialSelection
      ? {
          addressLine1: initial!.addressLine1!,
          city: initial!.city ?? '',
          postcode: (initial!.postcode ?? '').toUpperCase(),
          ...(initial!.addressLine2 ? { addressLine2: initial!.addressLine2 } : {}),
          latitude: initial!.latitude as number,
          longitude: initial!.longitude as number,
          ...(initial!.mapboxPlaceId ? { mapboxPlaceId: initial!.mapboxPlaceId } : {}),
        }
      : null,
  );
  const [error, setError] = useState<string | null>(null);

  const mapboxToken = useMemo(
    () =>
      (process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ??
        process.env.NEXT_PUBLIC_MAPBOX_TOKEN ??
        '').trim(),
    [],
  );

  const handleRetrieve = (res: MapboxRetrieveResponse) => {
    const feature = res.features?.[0];
    if (!feature) return;
    const props = feature.properties ?? {};
    const line1 = (props.address_line1 ?? props.feature_name ?? '').trim();
    const line2 = (props.address_line2 ?? '').trim();
    const cityValue = (
      props.address_level2 ?? props.place ?? props.address_level1 ?? ''
    ).trim();
    const post = (props.postcode ?? '').toUpperCase().trim();
    const coords = feature.geometry?.coordinates;
    const hasCoords = Array.isArray(coords) && coords.length === 2;

    if (!line1 || !post || !hasCoords) {
      setError('That address is missing a postcode — please pick another suggestion.');
      return;
    }

    const value: ManualAddressInput = {
      addressLine1: line1,
      city: cityValue,
      postcode: post,
      latitude: coords[1],
      longitude: coords[0],
    };
    if (line2) value.addressLine2 = line2;
    if (props.mapbox_id) value.mapboxPlaceId = props.mapbox_id;

    setSelected(value);
    setQuery(line1);
    setError(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) {
      setError('Please pick an address from the suggestions.');
      return;
    }
    setError(null);
    onSubmit(selected);
  };

  const searchInput = (
    <Input
      value={query}
      onChange={(e) => {
        setQuery(e.target.value);
        if (selected) setSelected(null);
      }}
      bg="bg.canvas"
      borderColor="border.subtle"
      color="fg.default"
      autoComplete="address-line1"
      placeholder="Start typing your address or postcode…"
    />
  );

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack gap="3">
        <Field.Root>
          <Field.Label color="fg.default">Address or postcode</Field.Label>
          {mapboxToken ? (
            <AddressAutofill
              accessToken={mapboxToken}
              options={{ country: 'GB', language: 'en' }}
              onRetrieve={handleRetrieve}
            >
              {searchInput}
            </AddressAutofill>
          ) : (
            searchInput
          )}
          <Field.HelperText color="fg.muted">
            Pick a suggestion so we get an exact postcode and pin.
          </Field.HelperText>
        </Field.Root>

        {selected && (
          <Box
            p="3"
            borderRadius="md"
            borderWidth="1px"
            borderColor="border.gold"
            bg="bg.surface"
          >
            <Text fontFamily="heading" fontSize="xs" color="accent.neon" mb="1">
              Selected address
            </Text>
            <Text color="fg.default" fontSize="sm">
              {selected.addressLine1}
              {selected.city ? `, ${selected.city}` : ''} · {selected.postcode}
            </Text>
          </Box>
        )}

        {error && (
          <Text color="accent.neon" fontSize="sm">
            {error}
          </Text>
        )}
        <GoldButton type="submit" variant="solid" disabled={!selected}>
          Use this address
        </GoldButton>
      </Stack>
    </form>
  );
}
