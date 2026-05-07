import { db, schema, eq } from '@tyrerepair/db';
import {
  PricingEngineError,
  type AppliedMultiplier,
  type DynamicPricing,
  type DynamicQuoteInput,
  type DynamicQuoteResult,
  type ManualLocationInput,
  type PricingBreakdown,
  type PricingFactorsActive,
  type StockPricingSnapshot,
  type TyrePricingSnapshot,
} from './types';
import { calculatePricingSafety, type LocationConfidence } from './profit-guard';
import { addMoney, multiplyMoney, roundGbp } from './money';
import { getPricingRules, getPricingRuleNumber } from './rules';
import { calculateTimeFactor } from './time';
import { calculateDateFactor } from './date';
import { calculateDistanceFactor } from './distance';
import { calculateDemandFactor } from './demand';
import { calculateOverrideFactor } from './overrides';
import { getWeatherPricingFactor } from './weather';
import { availabilityFromQuantity } from '@/lib/quote/tyres';
import type { TyreTier, TyreType } from '@/types/quote';

const QUOTE_EXPIRY_MINUTES = 30;

interface ResolvedLocation {
  locationId: string | null;
  latitude: number | null;
  longitude: number | null;
  addressLine1: string | null;
  city: string | null;
  postcode: string | null;
}

async function resolveLocation(
  input: DynamicQuoteInput,
): Promise<ResolvedLocation | null> {
  if (input.locationId) {
    try {
      const rows = await db
        .select({
          id: schema.customerLocations.id,
          latitude: schema.customerLocations.latitude,
          longitude: schema.customerLocations.longitude,
          addressLine1: schema.customerLocations.addressLine1,
          city: schema.customerLocations.city,
          postcode: schema.customerLocations.postcode,
        })
        .from(schema.customerLocations)
        .where(eq(schema.customerLocations.id, input.locationId))
        .limit(1);
      const r = rows[0];
      if (!r) {
        throw new PricingEngineError('invalid_location', 'Location not found');
      }
      return {
        locationId: r.id,
        latitude: r.latitude !== null ? Number(r.latitude) : null,
        longitude: r.longitude !== null ? Number(r.longitude) : null,
        addressLine1: r.addressLine1 ?? null,
        city: r.city ?? null,
        postcode: r.postcode ?? null,
      };
    } catch (err) {
      if (err instanceof PricingEngineError) throw err;
      throw new PricingEngineError('db_error', 'Could not load location');
    }
  }
  if (input.manualLocation) {
    const m: ManualLocationInput = input.manualLocation;
    return {
      locationId: null,
      latitude: typeof m.latitude === 'number' ? m.latitude : null,
      longitude: typeof m.longitude === 'number' ? m.longitude : null,
      addressLine1: m.addressLine1,
      city: m.city,
      postcode: m.postcode,
    };
  }
  return null;
}

async function loadTyreAndStock(
  tyreId: string,
): Promise<{ tyre: TyrePricingSnapshot; stock: StockPricingSnapshot }> {
  let rows;
  try {
    rows = await db
      .select({
        tyreId: schema.tyreCatalog.id,
        sku: schema.tyreCatalog.sku,
        brand: schema.tyreCatalog.brand,
        model: schema.tyreCatalog.model,
        sizeLabel: schema.tyreCatalog.sizeLabel,
        width: schema.tyreCatalog.width,
        profile: schema.tyreCatalog.profile,
        rim: schema.tyreCatalog.rim,
        speedRating: schema.tyreCatalog.speedRating,
        loadIndex: schema.tyreCatalog.loadIndex,
        tier: schema.tyreCatalog.tier,
        type: schema.tyreCatalog.type,
        basePriceGbp: schema.tyreCatalog.basePriceGbp,
        isActive: schema.tyreCatalog.isActive,
        quantityAvailable: schema.stock.quantityAvailable,
        lowStockThreshold: schema.stock.lowStockThreshold,
      })
      .from(schema.tyreCatalog)
      .leftJoin(schema.stock, eq(schema.stock.tyreId, schema.tyreCatalog.id))
      .where(eq(schema.tyreCatalog.id, tyreId))
      .limit(1);
  } catch {
    throw new PricingEngineError('db_error', 'Could not load tyre');
  }

  const row = rows[0];
  if (!row) throw new PricingEngineError('tyre_not_found', 'Tyre not found');
  if (!row.isActive) throw new PricingEngineError('tyre_inactive', 'Tyre is not currently available');

  const tyre: TyrePricingSnapshot = {
    tyreId: row.tyreId,
    sku: row.sku,
    brand: row.brand,
    model: row.model,
    sizeLabel: row.sizeLabel,
    width: row.width,
    profile: row.profile,
    rim: row.rim,
    speedRating: row.speedRating,
    loadIndex: row.loadIndex,
    tier: row.tier as TyreTier,
    type: row.type as TyreType,
    basePriceGbp: roundGbp(Number(row.basePriceGbp)),
  };
  const stock: StockPricingSnapshot = {
    quantityAvailable: row.quantityAvailable ?? 0,
    lowStockThreshold: row.lowStockThreshold ?? 2,
  };
  return { tyre, stock };
}

export async function calculateDynamicQuote(
  input: DynamicQuoteInput,
): Promise<DynamicQuoteResult> {
  const now = input.quoteTime ?? new Date();
  const jobType = input.jobType ?? 'REPLACEMENT';

  if (jobType === 'REPLACEMENT' && !input.tyreId) {
    throw new PricingEngineError('tyre_not_found', 'tyreId required for replacement quote');
  }

  const isAssessment = jobType === 'ASSESSMENT';

  const [tyreAndStock, rules, resolvedLocation] = await Promise.all([
    isAssessment ? Promise.resolve(null) : loadTyreAndStock(input.tyreId as string),
    getPricingRules(),
    resolveLocation(input),
  ]);

  const tyre: TyrePricingSnapshot | null = tyreAndStock ? tyreAndStock.tyre : null;
  const stock: StockPricingSnapshot | null = tyreAndStock ? tyreAndStock.stock : null;

  const time = calculateTimeFactor(rules, now);
  const date = calculateDateFactor(rules, now);
  const distance = calculateDistanceFactor(rules, {
    latitude: resolvedLocation?.latitude ?? null,
    longitude: resolvedLocation?.longitude ?? null,
  });

  const [weather, demand, overrides] = await Promise.all([
    getWeatherPricingFactor(rules, {
      latitude: resolvedLocation?.latitude ?? null,
      longitude: resolvedLocation?.longitude ?? null,
    }),
    calculateDemandFactor(rules),
    calculateOverrideFactor(now),
  ]);

  const appliedMultipliers: AppliedMultiplier[] = [
    { key: 'time', label: 'Time of day', multiplier: time.multiplier },
    { key: 'weather', label: 'Weather conditions', multiplier: weather.multiplier },
    { key: 'date', label: 'Date adjustment', multiplier: date.multiplier },
    { key: 'demand', label: 'Current demand', multiplier: demand.multiplier },
    { key: 'override', label: 'Admin price adjustment', multiplier: overrides.multiplier },
  ];

  const totalMultiplier = appliedMultipliers.reduce<number>(
    (acc, m) => acc * (Number.isFinite(m.multiplier) && m.multiplier > 0 ? m.multiplier : 1),
    1,
  );

  // Base price: tyre base for replacement, assessment fee for assessment.
  const assessmentFeeGbpNumber = getPricingRuleNumber(
    rules,
    'emergency_assessment_fee_gbp',
    49,
  );
  const baseGbp: string = isAssessment
    ? roundGbp(assessmentFeeGbpNumber)
    : (tyre as TyrePricingSnapshot).basePriceGbp;

  const multipliedTyrePriceGbp = multiplyMoney(baseGbp, totalMultiplier);
  const distanceFeeGbp = distance.feeGbp;
  const preVatSubtotalGbp = addMoney(multipliedTyrePriceGbp, distanceFeeGbp);
  // VAT removed: business is not VAT registered.
  const vatRate = 0;
  const vatAmountGbp: string = '0.00';
  const totalPriceGbp = preVatSubtotalGbp;

  const notes: string[] = [];
  if (isAssessment) {
    notes.push(
      'Emergency tyre assessment booked. We will inspect the tyre and recommend repair or replacement on site.',
    );
  }
  if (weather.severity === 'unavailable') {
    notes.push('Weather check unavailable — no weather uplift applied.');
  }
  if (distance.distanceMiles === null) {
    notes.push('Distance will be confirmed from your location.');
  }
  if (overrides.activeOverrides.length > 0) {
    notes.push('An admin price adjustment is currently active.');
  }

  const breakdown: PricingBreakdown = {
    time,
    weather,
    date,
    distance,
    demand,
    overrides,
    appliedMultipliers,
    notes,
  };

  const pricing: DynamicPricing = {
    basePriceGbp: baseGbp,
    multipliedTyrePriceGbp,
    distanceFeeGbp,
    preVatSubtotalGbp,
    vatRate,
    vatAmountGbp,
    totalPriceGbp,
    currency: 'GBP',
    breakdown,
  };

  const calculatedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + QUOTE_EXPIRY_MINUTES * 60_000).toISOString();
  const availability = stock
    ? availabilityFromQuantity(stock.quantityAvailable, stock.lowStockThreshold)
    : 'in_stock';

  const pricingSafety = await calculatePricingSafety({
    jobType,
    tyreProblemType: input.tyreProblemType ?? null,
    distanceMiles: distance.distanceMiles,
    locationConfidence: ((): LocationConfidence => {
      if (!resolvedLocation) return 'MISSING_LOCATION';
      if (resolvedLocation.locationId) return 'CONFIRMED_ADDRESS';
      if (resolvedLocation.addressLine1 && resolvedLocation.postcode) {
        return 'CONFIRMED_ADDRESS';
      }
      if (resolvedLocation.latitude != null && resolvedLocation.longitude != null) {
        return 'GPS_ONLY';
      }
      return 'WEAK_ADDRESS';
    })(),
    finalTotalGbp: totalPriceGbp,
    baseAssessmentFeeGbp: isAssessment ? roundGbp(assessmentFeeGbpNumber) : null,
    selectedTyrePriceGbp: tyre ? tyre.basePriceGbp : null,
    now,
    isLateNight: time.band === 'night',
    isWeekend: date.isWeekend,
    isBankHoliday: date.isBankHoliday,
    isHighDemand: demand.multiplier > 1,
    weatherSeverity: weather.severity,
    rules,
    ...(input.pricingChannel ? { pricingChannel: input.pricingChannel } : {}),
  });

  return {
    tyre,
    stock,
    jobType,
    tyreProblemType: input.tyreProblemType ?? null,
    assessmentFeeGbp: isAssessment ? roundGbp(assessmentFeeGbpNumber) : null,
    pricing,
    availability,
    calculatedAt,
    expiresAt,
    resolvedLocation,
    pricingSafety,
    pricingFactorsActive: {
      distance: distance.distanceMiles != null && parseFloat(distance.feeGbp) > 0,
      timeOfDay: time.multiplier !== 1,
      lateNight: time.band === 'night',
      weekend: date.isWeekend,
      bankHoliday: date.isBankHoliday,
      weather: weather.multiplier !== 1,
      demand: demand.multiplier !== 1,
      traffic: false,
      adminOverride: overrides.activeOverrides.length > 0,
    } satisfies PricingFactorsActive,
  };
}
