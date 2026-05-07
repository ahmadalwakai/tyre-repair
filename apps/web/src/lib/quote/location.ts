import type { ManualAddressInput } from '@/types/quote';

export function isManualAddressComplete(a: Partial<ManualAddressInput>): a is ManualAddressInput {
  return Boolean(a.addressLine1 && a.city && a.postcode);
}
