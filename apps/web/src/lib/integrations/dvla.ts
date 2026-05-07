import 'server-only';
import { normalizeRegistration } from '@/lib/quote/vehicle';
import type { VehicleLookupResult } from '@/types/quote';

export type DvlaErrorCode =
  | 'missing_api_key'
  | 'invalid_registration'
  | 'not_found'
  | 'upstream_error'
  | 'timeout'
  | 'unknown';

export type DvlaVehicleLookupResult =
  | { ok: true; vehicle: VehicleLookupResult }
  | { ok: false; code: DvlaErrorCode; status: number; message: string };

interface DvlaRawResponse {
  registrationNumber?: string;
  make?: string;
  model?: string;
  yearOfManufacture?: number;
  fuelType?: string;
  colour?: string;
  motStatus?: string;
  taxStatus?: string;
}

const DVLA_URL =
  'https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles';

export async function lookupVehicleByRegistration(
  registration: string,
): Promise<DvlaVehicleLookupResult> {
  const apiKey = process.env.DVLA_VES_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      code: 'missing_api_key',
      status: 500,
      message: 'Vehicle lookup is not configured',
    };
  }

  const reg = normalizeRegistration(registration);
  if (!/^[A-Z0-9]{1,8}$/.test(reg)) {
    return {
      ok: false,
      code: 'invalid_registration',
      status: 400,
      message: 'Invalid registration',
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(DVLA_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({ registrationNumber: reg }),
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.status === 404) {
      return { ok: false, code: 'not_found', status: 404, message: 'Vehicle not found' };
    }
    if (!res.ok) {
      return {
        ok: false,
        code: 'upstream_error',
        status: 502,
        message: 'Vehicle service is temporarily unavailable',
      };
    }

    const raw = (await res.json()) as DvlaRawResponse;
    const vehicle: VehicleLookupResult = {
      registration: raw.registrationNumber ?? reg,
      make: raw.make ?? null,
      model: raw.model ?? null,
      yearOfManufacture: typeof raw.yearOfManufacture === 'number' ? raw.yearOfManufacture : null,
      fuelType: raw.fuelType ?? null,
      colour: raw.colour ?? null,
      motStatus: raw.motStatus ?? null,
      taxStatus: raw.taxStatus ?? null,
      rawSource: 'dvla_ves',
    };
    return { ok: true, vehicle };
  } catch (err) {
    clearTimeout(timer);
    const aborted = err instanceof Error && err.name === 'AbortError';
    return {
      ok: false,
      code: aborted ? 'timeout' : 'unknown',
      status: 502,
      message: aborted ? 'Vehicle lookup timed out' : 'Vehicle lookup failed',
    };
  }
}
