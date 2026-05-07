/**
 * Phase 4 quote flow types.
 * No `any`. All values are explicit string unions where applicable.
 */

export type TyreTier = 'budget' | 'mid_range' | 'premium';
export type TyreType = 'summer' | 'winter' | 'all_season' | 'run_flat' | 'commercial';
export type TyreAvailability = 'in_stock' | 'low_stock' | 'special_order';

export type TyreProblemType =
  | 'PUNCTURE_OR_FLAT'
  | 'DAMAGED_OR_BLOWN_OUT'
  | 'SLOW_PRESSURE_LOSS'
  | 'NEEDS_REPLACEMENT'
  | 'NOT_SURE';

export type QuoteJobType = 'ASSESSMENT' | 'REPLACEMENT';

export interface BackupTyreSummary {
  tyreId: string;
  brand: string;
  model: string;
  sizeLabel: string;
}

export type QuoteFlowStep = 'vehicle' | 'tyre' | 'location' | 'quote';

export type LocationCaptureMethod =
  | 'manual_address'
  | 'mapbox_autocomplete'
  | 'sms_link'
  | 'email_link'
  | 'browser_geolocation';

export interface VehicleLookupForm {
  vehicleRegistration: string;
}

export interface VehicleLookupResult {
  registration: string;
  make: string | null;
  model: string | null;
  yearOfManufacture: number | null;
  fuelType: string | null;
  colour: string | null;
  motStatus: string | null;
  taxStatus: string | null;
  rawSource: 'dvla_ves' | 'manual';
}

export interface ManualVehicleInput {
  manualTyreSize?: string;
  vehicleMake?: string;
  vehicleModel?: string;
}

export interface VehicleSelection {
  registration: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  manualTyreSize: string | null;
}

export interface TyreSearchFilters {
  sizeLabel?: string;
  tier?: TyreTier;
  type?: TyreType;
  limit?: number;
}

export type TyreRecommendationBadge =
  | 'fastest_fitting'
  | 'fastest_available'
  | 'best_value'
  | 'budget_option'
  | 'premium_option';

export interface TyreSearchResultItem {
  tyreId: string;
  sku: string;
  brand: string;
  model: string;
  sizeLabel: string;
  width: number;
  profile: number;
  rim: number;
  speedRating: string;
  loadIndex: string;
  tier: TyreTier;
  type: TyreType;
  basePriceGbp: number;
  quantityAvailable: number;
  lowStockThreshold: number;
  availability: TyreAvailability;
  isSpecialOrder: boolean;
  /** Optional deterministic recommendation badge (Phase 11). */
  recommendationBadge?: TyreRecommendationBadge | null;
}

export type SelectedTyre = TyreSearchResultItem;

export interface ManualAddressInput {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postcode: string;
  country?: string;
}

export interface CapturedLocation {
  method: LocationCaptureMethod;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postcode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  mapboxPlaceId?: string;
  accuracyMeters?: number;
  locationId?: string;
}

export interface SendLocationLinkInput {
  method: 'sms' | 'email';
  phone?: string;
  email?: string;
}

export interface SendLocationLinkResult {
  success: boolean;
  method: 'sms' | 'email';
  expiresInMinutes: number;
  debugUrl?: string;
}

export interface CreateQuoteInput {
  vehicleRegistration?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  jobType: QuoteJobType;
  tyreProblemType?: TyreProblemType;
  /** Required when jobType === 'REPLACEMENT'. */
  tyreId?: string;
  /** Optional backup tyre noted for an ASSESSMENT job. */
  backupTyreId?: string;
  locationId?: string;
  manualLocation?: ManualAddressInput;
  customerPhone?: string;
  customerEmail?: string;
  customerName?: string;
}

/** @deprecated Phase 4 placeholder shape. Phase 5 uses DynamicPricing. */
export interface QuotePricingBreakdown {
  basePriceGbp: number;
  emergencyCalloutEstimateGbp: number;
  subtotalGbp: number;
  vatRate: number;
  vatAmountGbp: number;
  totalPriceGbp: number;
  notes: string[];
}

export interface QuoteDisplayData {
  quoteId: string;
  jobType: QuoteJobType;
  tyreProblemType: TyreProblemType | null;
  /** Null when jobType === 'ASSESSMENT' (no specific tyre selected). */
  tyre: TyreSearchResultItem | null;
  /** Optional backup tyre noted on an assessment booking. */
  backupTyre: BackupTyreSummary | null;
  /** Assessment fee charged when jobType === 'ASSESSMENT'. */
  assessmentFeeGbp: string | null;
  availability: TyreAvailability;
  vehicle: {
    registration: string | null;
    make: string | null;
    model: string | null;
    year: number | null;
  };
  location: {
    locationId: string | null;
    addressLine1: string | null;
    city: string | null;
    postcode: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
  pricing: import('@/lib/pricing/types').DynamicPricing;
  /** Customer-safe pricing-safety projection — gates the public Pay now CTA. */
  pricingSafetyPublic: import('@/lib/pricing/public-safety').PricingSafetyPublic;
  expiresAt: string;
  createdAt: string;
}
