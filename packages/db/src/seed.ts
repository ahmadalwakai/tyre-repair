import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { eq, sql } from 'drizzle-orm';
import { db } from './client';
import {
  admins,
  appSettings,
  pricingRules,
  stock,
  tyreCatalog,
  type NewPricingRule,
  type NewTyreCatalogItem,
} from './schema';

type SeedTyre = Omit<NewTyreCatalogItem, 'id' | 'createdAt' | 'updatedAt'> & {
  initialStock: number;
};

const TYRES: SeedTyre[] = [
  // Budget
  { sku: 'TR-BUD-175-65-14-SUM-001', brand: 'RoadX', model: 'RXMotion', width: 175, profile: 65, rim: 14, sizeLabel: '175/65R14', speedRating: 'T', loadIndex: '82', tier: 'budget', type: 'summer', basePriceGbp: '54.99', initialStock: 8 },
  { sku: 'TR-BUD-185-65-15-SUM-001', brand: 'Goodride', model: 'RP28', width: 185, profile: 65, rim: 15, sizeLabel: '185/65R15', speedRating: 'H', loadIndex: '88', tier: 'budget', type: 'summer', basePriceGbp: '59.99', initialStock: 12 },
  { sku: 'TR-BUD-195-55-16-SUM-001', brand: 'Triangle', model: 'TE301', width: 195, profile: 55, rim: 16, sizeLabel: '195/55R16', speedRating: 'V', loadIndex: '87', tier: 'budget', type: 'summer', basePriceGbp: '67.99', initialStock: 0 },
  { sku: 'TR-BUD-195-65-15-ALL-001', brand: 'Linglong', model: 'GreenMax All Season', width: 195, profile: 65, rim: 15, sizeLabel: '195/65R15', speedRating: 'H', loadIndex: '91', tier: 'budget', type: 'all_season', basePriceGbp: '64.99', initialStock: 6 },
  { sku: 'TR-BUD-205-55-16-SUM-001', brand: 'Landsail', model: 'LS388', width: 205, profile: 55, rim: 16, sizeLabel: '205/55R16', speedRating: 'V', loadIndex: '91', tier: 'budget', type: 'summer', basePriceGbp: '69.99', initialStock: 10 },
  { sku: 'TR-BUD-215-55-17-SUM-001', brand: 'Rotalla', model: 'Setula', width: 215, profile: 55, rim: 17, sizeLabel: '215/55R17', speedRating: 'W', loadIndex: '94', tier: 'budget', type: 'summer', basePriceGbp: '82.99', initialStock: 1 },
  { sku: 'TR-BUD-225-45-17-SUM-001', brand: 'Hifly', model: 'HF805', width: 225, profile: 45, rim: 17, sizeLabel: '225/45R17', speedRating: 'W', loadIndex: '94', tier: 'budget', type: 'summer', basePriceGbp: '74.99', initialStock: 5 },
  { sku: 'TR-BUD-225-40-18-SUM-001', brand: 'Accelera', model: 'Phi', width: 225, profile: 40, rim: 18, sizeLabel: '225/40R18', speedRating: 'Y', loadIndex: '92', tier: 'budget', type: 'summer', basePriceGbp: '84.99', initialStock: 4 },
  // Mid-range
  { sku: 'TR-MID-185-65-15-SUM-001', brand: 'Avon', model: 'ZV7', width: 185, profile: 65, rim: 15, sizeLabel: '185/65R15', speedRating: 'H', loadIndex: '88', tier: 'mid_range', type: 'summer', basePriceGbp: '78.99', initialStock: 7 },
  { sku: 'TR-MID-195-65-15-ALL-001', brand: 'Falken', model: 'AS210', width: 195, profile: 65, rim: 15, sizeLabel: '195/65R15', speedRating: 'H', loadIndex: '91', tier: 'mid_range', type: 'all_season', basePriceGbp: '89.99', initialStock: 2 },
  { sku: 'TR-MID-205-55-16-SUM-001', brand: 'Hankook', model: 'Ventus Prime 4', width: 205, profile: 55, rim: 16, sizeLabel: '205/55R16', speedRating: 'V', loadIndex: '91', tier: 'mid_range', type: 'summer', basePriceGbp: '94.99', initialStock: 9 },
  { sku: 'TR-MID-205-55-16-WIN-001', brand: 'Kleber', model: 'Krisalp HP3', width: 205, profile: 55, rim: 16, sizeLabel: '205/55R16', speedRating: 'H', loadIndex: '91', tier: 'mid_range', type: 'winter', basePriceGbp: '99.99', initialStock: 0 },
  { sku: 'TR-MID-215-55-17-SUM-001', brand: 'Toyo', model: 'Proxes Comfort', width: 215, profile: 55, rim: 17, sizeLabel: '215/55R17', speedRating: 'W', loadIndex: '94', tier: 'mid_range', type: 'summer', basePriceGbp: '109.99', initialStock: 6 },
  { sku: 'TR-MID-225-45-17-SUM-001', brand: 'Uniroyal', model: 'RainSport 5', width: 225, profile: 45, rim: 17, sizeLabel: '225/45R17', speedRating: 'Y', loadIndex: '94', tier: 'mid_range', type: 'summer', basePriceGbp: '104.99', initialStock: 5 },
  { sku: 'TR-MID-225-40-18-SUM-001', brand: 'Kumho', model: 'Ecsta PS71', width: 225, profile: 40, rim: 18, sizeLabel: '225/40R18', speedRating: 'Y', loadIndex: '92', tier: 'mid_range', type: 'summer', basePriceGbp: '112.99', initialStock: 1 },
  { sku: 'TR-MID-235-55-18-ALL-001', brand: 'Nexen', model: 'N Blue 4Season 2', width: 235, profile: 55, rim: 18, sizeLabel: '235/55R18', speedRating: 'V', loadIndex: '104', tier: 'mid_range', type: 'all_season', basePriceGbp: '129.99', initialStock: 4 },
  // Premium
  { sku: 'TR-PRE-195-55-16-SUM-001', brand: 'Michelin', model: 'Primacy 4+', width: 195, profile: 55, rim: 16, sizeLabel: '195/55R16', speedRating: 'V', loadIndex: '87', tier: 'premium', type: 'summer', basePriceGbp: '129.99', initialStock: 3 },
  { sku: 'TR-PRE-205-55-16-SUM-001', brand: 'Continental', model: 'PremiumContact 7', width: 205, profile: 55, rim: 16, sizeLabel: '205/55R16', speedRating: 'V', loadIndex: '91', tier: 'premium', type: 'summer', basePriceGbp: '124.99', initialStock: 8 },
  { sku: 'TR-PRE-205-55-16-ALL-001', brand: 'Goodyear', model: 'Vector 4Seasons Gen-3', width: 205, profile: 55, rim: 16, sizeLabel: '205/55R16', speedRating: 'V', loadIndex: '91', tier: 'premium', type: 'all_season', basePriceGbp: '134.99', initialStock: 2 },
  { sku: 'TR-PRE-215-55-17-SUM-001', brand: 'Bridgestone', model: 'Turanza 6', width: 215, profile: 55, rim: 17, sizeLabel: '215/55R17', speedRating: 'W', loadIndex: '94', tier: 'premium', type: 'summer', basePriceGbp: '149.99', initialStock: 6 },
  { sku: 'TR-PRE-225-45-17-SUM-001', brand: 'Michelin', model: 'Pilot Sport 5', width: 225, profile: 45, rim: 17, sizeLabel: '225/45R17', speedRating: 'Y', loadIndex: '94', tier: 'premium', type: 'summer', basePriceGbp: '139.99', initialStock: 0 },
  { sku: 'TR-PRE-225-40-18-SUM-001', brand: 'Continental', model: 'SportContact 7', width: 225, profile: 40, rim: 18, sizeLabel: '225/40R18', speedRating: 'Y', loadIndex: '92', tier: 'premium', type: 'summer', basePriceGbp: '159.99', initialStock: 4 },
  { sku: 'TR-PRE-235-55-18-ALL-001', brand: 'Pirelli', model: 'Scorpion All Season SF2', width: 235, profile: 55, rim: 18, sizeLabel: '235/55R18', speedRating: 'V', loadIndex: '104', tier: 'premium', type: 'all_season', basePriceGbp: '174.99', initialStock: 1 },
  { sku: 'TR-PRE-255-35-19-RUN-001', brand: 'Goodyear', model: 'Eagle F1 Asymmetric 6 RunOnFlat', width: 255, profile: 35, rim: 19, sizeLabel: '255/35R19', speedRating: 'Y', loadIndex: '96', tier: 'premium', type: 'run_flat', basePriceGbp: '219.99', initialStock: 2 },
];

const PRICING_RULES: Array<{
  key: NewPricingRule['key'];
  label: string;
  numericValue: string;
  isMultiplier: boolean;
  isActive: boolean;
  sortOrder: number;
}> = [
  { key: 'time_night', label: 'Night surge', numericValue: '1.3500', isMultiplier: true, isActive: true, sortOrder: 10 },
  { key: 'time_peak_morning', label: 'Peak morning surge', numericValue: '1.1500', isMultiplier: true, isActive: true, sortOrder: 20 },
  { key: 'weather_moderate', label: 'Moderate weather surge', numericValue: '1.1500', isMultiplier: true, isActive: true, sortOrder: 30 },
  { key: 'weather_severe', label: 'Severe weather surge', numericValue: '1.4000', isMultiplier: true, isActive: true, sortOrder: 40 },
  { key: 'date_weekend', label: 'Weekend surge', numericValue: '1.1000', isMultiplier: true, isActive: true, sortOrder: 50 },
  { key: 'date_bank_holiday', label: 'Bank holiday surge', numericValue: '1.1500', isMultiplier: true, isActive: true, sortOrder: 60 },
  { key: 'distance_free_miles', label: 'Free distance miles', numericValue: '5.0000', isMultiplier: false, isActive: true, sortOrder: 70 },
  { key: 'distance_per_mile_gbp', label: 'Distance per mile GBP', numericValue: '1.2000', isMultiplier: false, isActive: true, sortOrder: 80 },
  { key: 'demand_open_jobs_threshold', label: 'High demand open jobs threshold', numericValue: '10.0000', isMultiplier: false, isActive: true, sortOrder: 90 },
  { key: 'demand_high_multiplier', label: 'High demand multiplier', numericValue: '1.2000', isMultiplier: true, isActive: true, sortOrder: 100 },
  // VAT is OFF: business is not VAT registered. Row kept (legacy) but inactive and zeroed.
  { key: 'vat_rate', label: 'VAT rate (disabled - not VAT registered)', numericValue: '0.0000', isMultiplier: false, isActive: false, sortOrder: 110 },
  { key: 'emergency_assessment_fee_gbp', label: 'Emergency tyre assessment fee', numericValue: '49.0000', isMultiplier: false, isActive: true, sortOrder: 85 },
];

const APP_SETTINGS: Array<{ key: string; value: unknown; description: string }> = [
  {
    key: 'business_profile',
    description: 'Public business identity, address, and contact details.',
    value: {
      businessName: 'TyreRepair UK',
      phone: '0141 266 0690',
      whatsapp: '+44 7423 262955',
      address: 'Unit 1, 10 Gateside Street, Glasgow G31 1PD',
      currency: 'GBP',
      distanceUnit: 'miles',
    },
  },
  {
    key: 'coverage',
    description: 'Service coverage area configuration.',
    value: { country: 'Scotland', mode: 'whole_country' },
  },
  {
    key: 'realtime',
    description: 'Realtime provider configuration.',
    value: { provider: 'pusher', cluster: 'eu' },
  },
];

interface SeedSummary {
  adminAction: 'created' | 'updated';
  pricingRulesCount: number;
  tyreCatalogCount: number;
  stockCount: number;
  appSettingsCount: number;
}

async function seedAdmin(): Promise<'created' | 'updated'> {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD env vars are required');
  }
  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await db.select().from(admins).where(eq(admins.email, email)).limit(1);
  if (existing.length === 0) {
    await db.insert(admins).values({
      email,
      passwordHash,
      fullName: 'TyreRepair Owner',
      role: 'owner',
      isActive: true,
    });
    return 'created';
  }
  await db
    .update(admins)
    .set({ passwordHash, role: 'owner', isActive: true, updatedAt: new Date() })
    .where(eq(admins.email, email));
  return 'updated';
}

async function seedPricingRules(): Promise<number> {
  for (const rule of PRICING_RULES) {
    await db
      .insert(pricingRules)
      .values(rule)
      .onConflictDoUpdate({
        target: pricingRules.key,
        set: {
          label: rule.label,
          numericValue: rule.numericValue,
          isMultiplier: rule.isMultiplier,
          isActive: rule.isActive,
          sortOrder: rule.sortOrder,
          updatedAt: new Date(),
        },
      });
  }
  const rows = await db.select({ c: sql<number>`count(*)::int` }).from(pricingRules);
  return rows[0]?.c ?? 0;
}

async function seedAppSettings(): Promise<number> {
  for (const setting of APP_SETTINGS) {
    await db
      .insert(appSettings)
      .values({
        key: setting.key,
        value: setting.value,
        description: setting.description,
      })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: {
          value: setting.value,
          description: setting.description,
          updatedAt: new Date(),
        },
      });
  }
  const rows = await db.select({ c: sql<number>`count(*)::int` }).from(appSettings);
  return rows[0]?.c ?? 0;
}

async function seedCatalogAndStock(): Promise<{ tyres: number; stockRows: number }> {
  for (const tyre of TYRES) {
    const { initialStock, ...row } = tyre;
    const inserted = await db
      .insert(tyreCatalog)
      .values(row)
      .onConflictDoUpdate({
        target: tyreCatalog.sku,
        set: {
          brand: row.brand,
          model: row.model,
          width: row.width,
          profile: row.profile,
          rim: row.rim,
          sizeLabel: row.sizeLabel,
          speedRating: row.speedRating,
          loadIndex: row.loadIndex,
          tier: row.tier,
          type: row.type ?? 'summer',
          basePriceGbp: row.basePriceGbp,
          isActive: true,
          updatedAt: new Date(),
        },
      })
      .returning({ id: tyreCatalog.id });

    const tyreId = inserted[0]?.id;
    if (!tyreId) continue;

    const existingStock = await db.select().from(stock).where(eq(stock.tyreId, tyreId)).limit(1);
    if (existingStock.length === 0) {
      await db.insert(stock).values({
        tyreId,
        quantityAvailable: initialStock,
        lowStockThreshold: 2,
        reservedQuantity: 0,
        locationName: 'Glasgow HQ',
      });
    }
  }
  const tyreCountRows = await db.select({ c: sql<number>`count(*)::int` }).from(tyreCatalog);
  const stockCountRows = await db.select({ c: sql<number>`count(*)::int` }).from(stock);
  return { tyres: tyreCountRows[0]?.c ?? 0, stockRows: stockCountRows[0]?.c ?? 0 };
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL env var is required to run seed');
  }
  const adminAction = await seedAdmin();
  const pricingRulesCount = await seedPricingRules();
  const appSettingsCount = await seedAppSettings();
  const { tyres, stockRows } = await seedCatalogAndStock();

  const summary: SeedSummary = {
    adminAction,
    pricingRulesCount,
    tyreCatalogCount: tyres,
    stockCount: stockRows,
    appSettingsCount,
  };

  // eslint-disable-next-line no-console
  console.log('[seed] complete', summary);
}

main().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error('[seed] failed', err);
  process.exit(1);
});
