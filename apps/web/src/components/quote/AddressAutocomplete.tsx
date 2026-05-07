'use client';
import { useState } from 'react';
import { Field, Input, Stack, Text } from '@chakra-ui/react';
import { GoldButton } from '@/components/ui/GoldButton';
import type { ManualAddressInput } from '@/types/quote';

export interface AddressAutocompleteProps {
  initial?: Partial<ManualAddressInput>;
  onSubmit: (address: ManualAddressInput) => void;
}

/**
 * Address capture. Mapbox Search JS is loaded only when a public token exists at
 * runtime — we read the public env var directly. To keep the bundle simple in
 * Phase 4, this renders a manual fallback form. The Mapbox autocomplete UI can
 * be enabled in a later phase by enhancing this component.
 */
export function AddressAutocomplete({ initial, onSubmit }: AddressAutocompleteProps) {
  const [addressLine1, setAddressLine1] = useState(initial?.addressLine1 ?? '');
  const [addressLine2, setAddressLine2] = useState(initial?.addressLine2 ?? '');
  const [city, setCity] = useState(initial?.city ?? '');
  const [postcode, setPostcode] = useState(initial?.postcode ?? '');
  const [error, setError] = useState<string | null>(null);

  const handle = () => {
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
    onSubmit(value);
  };

  return (
    <Stack gap="3">
      <Field.Root>
        <Field.Label color="fg.default">Address line 1</Field.Label>
        <Input
          value={addressLine1}
          onChange={(e) => setAddressLine1(e.target.value)}
          bg="bg.canvas"
          borderColor="border.subtle"
          color="fg.default"
          autoComplete="address-line1"
        />
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
      <GoldButton onClick={handle} variant="solid">
        Use this address
      </GoldButton>
    </Stack>
  );
}
