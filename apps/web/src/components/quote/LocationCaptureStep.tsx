'use client';
import { HStack, Stack, Text } from '@chakra-ui/react';
import { GoldButton } from '@/components/ui/GoldButton';
import { LocationMethodCard } from './LocationMethodCard';
import { AddressAutocomplete } from './AddressAutocomplete';
import { CurrentLocationCard } from './CurrentLocationCard';
import type { CapturedLocation, ManualAddressInput } from '@/types/quote';

export interface LocationCaptureStepProps {
  initial: CapturedLocation | null;
  onContinue: (location: CapturedLocation) => void;
  onBack: () => void;
}

export function LocationCaptureStep({ initial, onContinue, onBack }: LocationCaptureStepProps) {
  const handleAddress = (address: ManualAddressInput) => {
    const captured: CapturedLocation = {
      method: 'manual_address',
      addressLine1: address.addressLine1,
      city: address.city,
      postcode: address.postcode,
    };
    if (address.addressLine2) captured.addressLine2 = address.addressLine2;
    onContinue(captured);
  };

  return (
    <Stack gap="4">
      <Text color="fg.muted" fontSize="sm">
        Use your current location or enter the address where the mobile tyre fitter should come.
        We never ask for a date or time — we dispatch as soon as possible.
      </Text>

      <Stack gap="4">
        <LocationMethodCard
          title="Use current location"
          description="Use your phone or browser location to help us find you faster."
        >
          <CurrentLocationCard onConfirm={onContinue} />
        </LocationMethodCard>

        <LocationMethodCard
          title="Enter address manually"
          description="Type the address or postcode where you need us to come."
        >
          {(() => {
            const initAddr =
              initial?.method === 'manual_address'
                ? {
                    ...(initial.addressLine1 ? { addressLine1: initial.addressLine1 } : {}),
                    ...(initial.addressLine2 ? { addressLine2: initial.addressLine2 } : {}),
                    ...(initial.city ? { city: initial.city } : {}),
                    ...(initial.postcode ? { postcode: initial.postcode } : {}),
                  }
                : null;
            return (
              <AddressAutocomplete
                {...(initAddr ? { initial: initAddr } : {})}
                onSubmit={handleAddress}
              />
            );
          })()}
        </LocationMethodCard>
      </Stack>

      <HStack gap="3" wrap="wrap">
        <GoldButton onClick={onBack} variant="ghost">
          Back
        </GoldButton>
      </HStack>
    </Stack>
  );
}
