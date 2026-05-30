import { NextResponse } from 'next/server';
import { db, schema, eq } from '@tyrerepair/db';
import { quoteCreateSchema } from '@/lib/quote/validation';
import {
  calculateDynamicQuote,
  PricingEngineError,
  buildPricingSafetyPublic,
  type DynamicQuoteInput,
  type ManualLocationInput,
} from '@/lib/pricing';
import type { QuoteDisplayData, TyreSearchResultItem } from '@/types/quote';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = quoteCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid quote request', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const input = parsed.data;

  let customerId: string | null = null;
  if (input.customerName || input.customerPhone || input.customerEmail) {
    const phone = input.customerPhone ?? '';
    const name = input.customerName ?? 'Guest';
    if (phone) {
      try {
        const insertedCustomers = await db
          .insert(schema.customers)
          .values({
            fullName: name,
            phone,
            email: input.customerEmail ?? null,
          })
          .returning({ id: schema.customers.id });
        customerId = insertedCustomers[0]?.id ?? null;
      } catch {
        return NextResponse.json({ error: 'Could not save customer' }, { status: 500 });
      }
    }
  }

  let locationId: string | null = input.locationId ?? null;
  let locationDisplay: QuoteDisplayData['location'] = null;

  if (!locationId && input.manualLocation) {
    const m = input.manualLocation;
    try {
      const insertedLoc = await db
        .insert(schema.customerLocations)
        .values({
          customerId,
          captureMethod:
            m.latitude != null && m.longitude != null
              ? 'browser_geolocation'
              : 'manual_address',
          addressLine1: m.addressLine1,
          addressLine2: m.addressLine2 ?? null,
          city: m.city,
          postcode: m.postcode,
          country: m.country ?? 'United Kingdom',
          latitude: m.latitude != null ? String(m.latitude) : null,
          longitude: m.longitude != null ? String(m.longitude) : null,
        })
        .returning({
          id: schema.customerLocations.id,
          addressLine1: schema.customerLocations.addressLine1,
          city: schema.customerLocations.city,
          postcode: schema.customerLocations.postcode,
          latitude: schema.customerLocations.latitude,
          longitude: schema.customerLocations.longitude,
        });
      const lr = insertedLoc[0];
      if (lr) {
        locationId = lr.id;
        locationDisplay = {
          locationId: lr.id,
          addressLine1: lr.addressLine1 ?? null,
          city: lr.city ?? null,
          postcode: lr.postcode ?? null,
          latitude: lr.latitude !== null ? Number(lr.latitude) : null,
          longitude: lr.longitude !== null ? Number(lr.longitude) : null,
        };
      }
    } catch {
      return NextResponse.json({ error: 'Could not save location' }, { status: 500 });
    }
  } else if (locationId) {
    try {
      const locRows = await db
        .select({
          id: schema.customerLocations.id,
          addressLine1: schema.customerLocations.addressLine1,
          city: schema.customerLocations.city,
          postcode: schema.customerLocations.postcode,
          latitude: schema.customerLocations.latitude,
          longitude: schema.customerLocations.longitude,
        })
        .from(schema.customerLocations)
        .where(eq(schema.customerLocations.id, locationId))
        .limit(1);
      const lr = locRows[0];
      if (lr) {
        locationDisplay = {
          locationId: lr.id,
          addressLine1: lr.addressLine1 ?? null,
          city: lr.city ?? null,
          postcode: lr.postcode ?? null,
          latitude: lr.latitude !== null ? Number(lr.latitude) : null,
          longitude: lr.longitude !== null ? Number(lr.longitude) : null,
        };
      }
    } catch {
      return NextResponse.json({ error: 'Could not load location' }, { status: 500 });
    }
  }

  // Run dynamic pricing engine. Never accept time from customer.
  const engineInput: DynamicQuoteInput = {
    jobType: input.jobType,
    pricingChannel: 'PUBLIC_SELF_BOOKING',
  };
  if (input.tyreId) engineInput.tyreId = input.tyreId;
  if (input.tyreProblemType) engineInput.tyreProblemType = input.tyreProblemType;
  if (input.backupTyreId) engineInput.backupTyreId = input.backupTyreId;
  if (locationId) {
    engineInput.locationId = locationId;
  } else if (input.manualLocation) {
    const m: ManualLocationInput = {
      addressLine1: input.manualLocation.addressLine1,
      city: input.manualLocation.city,
      postcode: input.manualLocation.postcode,
      ...(input.manualLocation.addressLine2
        ? { addressLine2: input.manualLocation.addressLine2 }
        : {}),
      ...(input.manualLocation.country ? { country: input.manualLocation.country } : {}),
      ...(typeof input.manualLocation.latitude === 'number'
        ? { latitude: input.manualLocation.latitude }
        : {}),
      ...(typeof input.manualLocation.longitude === 'number'
        ? { longitude: input.manualLocation.longitude }
        : {}),
    };
    engineInput.manualLocation = m;
  }

  let result;
  try {
    result = await calculateDynamicQuote(engineInput);
  } catch (err) {
    if (err instanceof PricingEngineError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    // Never leak engine internals or stack traces to the public.
    return NextResponse.json(
      { error: 'Something went wrong, please try again or call us.' },
      { status: 500 },
    );
  }

  const { tyre, stock, pricing, availability, expiresAt, jobType, assessmentFeeGbp } = result;
  const tyreCard: TyreSearchResultItem | null = tyre && stock
    ? {
        tyreId: tyre.tyreId,
        sku: tyre.sku,
        brand: tyre.brand,
        model: tyre.model,
        sizeLabel: tyre.sizeLabel,
        width: tyre.width,
        profile: tyre.profile,
        rim: tyre.rim,
        speedRating: tyre.speedRating,
        loadIndex: tyre.loadIndex,
        tier: tyre.tier,
        type: tyre.type,
        basePriceGbp: Number(tyre.basePriceGbp),
        quantityAvailable: stock.quantityAvailable,
        lowStockThreshold: stock.lowStockThreshold,
        availability,
        isSpecialOrder: availability === 'special_order',
      }
    : null;

  // Validate optional backup tyre exists and is active.
  let backupTyreCard: import('@/types/quote').BackupTyreSummary | null = null;
  if (input.backupTyreId) {
    try {
      const rows = await db
        .select({
          id: schema.tyreCatalog.id,
          brand: schema.tyreCatalog.brand,
          model: schema.tyreCatalog.model,
          sizeLabel: schema.tyreCatalog.sizeLabel,
          isActive: schema.tyreCatalog.isActive,
        })
        .from(schema.tyreCatalog)
        .where(eq(schema.tyreCatalog.id, input.backupTyreId))
        .limit(1);
      const r = rows[0];
      if (r && r.isActive) {
        backupTyreCard = {
          tyreId: r.id,
          brand: r.brand,
          model: r.model,
          sizeLabel: r.sizeLabel,
        };
      }
    } catch {
      // ignore — backup tyre is optional and non-critical
    }
  }

  const expiresAtDate = new Date(expiresAt);
  const distanceMiles = pricing.breakdown.distance.distanceMiles;

  let createdQuoteId: string;
  let createdAt: Date;
  let createdExpires: Date;
  // Stash the customer's locking-nut answer inside pricingBreakdown so we
  // can recover it server-side at /checkout without a URL parameter and
  // without a schema migration. The bookings table is the canonical store
  // (it has its own column) — this is the pre-booking handoff only.
  const pricingBreakdownToPersist: Record<string, unknown> = {
    ...(pricing as unknown as Record<string, unknown>),
  };
  if (input.lockingWheelNutStatus) {
    pricingBreakdownToPersist['_customerSelections'] = {
      lockingWheelNutStatus: input.lockingWheelNutStatus,
    };
  }
  try {
    const insertedQuotes = await db
      .insert(schema.quotes)
      .values({
        customerId,
        locationId,
        tyreId: tyre ? tyre.tyreId : null,
        backupTyreId: backupTyreCard ? backupTyreCard.tyreId : null,
        jobType,
        tyreProblemType: input.tyreProblemType ?? null,
        assessmentFeeGbp: assessmentFeeGbp,
        vehicleRegistration: input.vehicleRegistration ?? null,
        vehicleMake: input.vehicleMake ?? null,
        vehicleModel: input.vehicleModel ?? null,
        vehicleYear: input.vehicleYear ?? null,
        basePriceGbp: pricing.basePriceGbp,
        finalPriceGbp: pricing.preVatSubtotalGbp,
        // VAT removed: business is not VAT registered. Always 0.00.
        vatAmountGbp: '0.00',
        totalPriceGbp: pricing.totalPriceGbp,
        distanceMiles: distanceMiles !== null ? distanceMiles.toFixed(2) : null,
        pricingBreakdown: pricingBreakdownToPersist,
        expiresAt: expiresAtDate,
      })
      .returning({
        id: schema.quotes.id,
        createdAt: schema.quotes.createdAt,
        expiresAt: schema.quotes.expiresAt,
      });
    const created = insertedQuotes[0];
    if (!created) {
      return NextResponse.json({ error: 'Could not create quote' }, { status: 500 });
    }
    createdQuoteId = created.id;
    createdAt = created.createdAt;
    createdExpires = created.expiresAt ?? expiresAtDate;
  } catch {
    return NextResponse.json({ error: 'Could not create quote' }, { status: 500 });
  }

  const pricingSafetyPublic = buildPricingSafetyPublic(result.pricingSafety);

  const display: QuoteDisplayData = {
    quoteId: createdQuoteId,
    jobType,
    tyreProblemType: input.tyreProblemType ?? null,
    tyre: tyreCard,
    backupTyre: backupTyreCard,
    assessmentFeeGbp,
    availability,
    vehicle: {
      registration: input.vehicleRegistration ?? null,
      make: input.vehicleMake ?? null,
      model: input.vehicleModel ?? null,
      year: input.vehicleYear ?? null,
    },
    location: locationDisplay,
    pricing,
    pricingSafetyPublic,
    expiresAt: createdExpires.toISOString(),
    createdAt: createdAt.toISOString(),
  };

  return NextResponse.json(display, { status: 201 });
}
