// One-off migration: apply coverage_zones table + seed initial data.
// Safe to re-run (uses IF NOT EXISTS / IF EXISTS guards; seed uses ON CONFLICT).
import 'dotenv/config';
import { neonConfig, Pool } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const pool = new Pool({ connectionString: url });

const ddl = [
  `DO $$ BEGIN
     CREATE TYPE "public"."coverage_zone_status" AS ENUM('active','paused','unavailable');
   EXCEPTION WHEN duplicate_object THEN null; END $$;`,

  `CREATE TABLE IF NOT EXISTS "coverage_zones" (
     "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
     "slug" varchar(80) NOT NULL UNIQUE,
     "name" varchar(160) NOT NULL,
     "status" "coverage_zone_status" DEFAULT 'active' NOT NULL,
     "city_or_region" varchar(160) NOT NULL,
     "postcode_prefixes" jsonb DEFAULT '[]'::jsonb NOT NULL,
     "base_postcode" varchar(16) NOT NULL,
     "radius_miles" integer DEFAULT 0 NOT NULL,
     "estimated_response_minutes_min" integer DEFAULT 0 NOT NULL,
     "estimated_response_minutes_max" integer DEFAULT 0 NOT NULL,
     "call_out_fee_pence" integer DEFAULT 0 NOT NULL,
     "available_now" boolean DEFAULT false NOT NULL,
     "available_today" boolean DEFAULT false NOT NULL,
     "available_tomorrow" boolean DEFAULT false NOT NULL,
     "daily_capacity" integer DEFAULT 0 NOT NULL,
     "priority" integer DEFAULT 50 NOT NULL,
     "notes" text,
     "created_at" timestamp with time zone DEFAULT now() NOT NULL,
     "updated_at" timestamp with time zone DEFAULT now() NOT NULL
   );`,

  `CREATE UNIQUE INDEX IF NOT EXISTS "coverage_zones_slug_unique_idx" ON "coverage_zones" ("slug");`,
  `CREATE INDEX IF NOT EXISTS "coverage_zones_status_idx" ON "coverage_zones" ("status");`,
  `CREATE INDEX IF NOT EXISTS "coverage_zones_priority_idx" ON "coverage_zones" ("priority");`,
];

const SEED = [
  { slug: 'glasgow', name: 'Glasgow & West', status: 'active', cityOrRegion: 'Glasgow',
    postcodePrefixes: ['G','PA','ML'], basePostcode: 'G31 1PD', radiusMiles: 25,
    estimatedResponseMinutesMin: 25, estimatedResponseMinutesMax: 45, callOutFeePence: 4900,
    availableNow: true, availableToday: true, availableTomorrow: true, dailyCapacity: 24, priority: 1,
    notes: 'Home base. Highest priority dispatch zone.' },
  { slug: 'edinburgh', name: 'Edinburgh & Lothians', status: 'active', cityOrRegion: 'Edinburgh',
    postcodePrefixes: ['EH'], basePostcode: 'EH1 1YZ', radiusMiles: 25,
    estimatedResponseMinutesMin: 45, estimatedResponseMinutesMax: 75, callOutFeePence: 5900,
    availableNow: true, availableToday: true, availableTomorrow: true, dailyCapacity: 14, priority: 2 },
  { slug: 'aberdeen', name: 'Aberdeen & Aberdeenshire', status: 'active', cityOrRegion: 'Aberdeen',
    postcodePrefixes: ['AB'], basePostcode: 'AB10 1XG', radiusMiles: 30,
    estimatedResponseMinutesMin: 90, estimatedResponseMinutesMax: 180, callOutFeePence: 8900,
    availableNow: false, availableToday: true, availableTomorrow: true, dailyCapacity: 4, priority: 5,
    notes: 'Long-distance zone. Confirm pricing manually for puncture-only jobs.' },
  { slug: 'dundee', name: 'Dundee & Angus', status: 'active', cityOrRegion: 'Dundee',
    postcodePrefixes: ['DD'], basePostcode: 'DD1 1DG', radiusMiles: 20,
    estimatedResponseMinutesMin: 75, estimatedResponseMinutesMax: 120, callOutFeePence: 7900,
    availableNow: false, availableToday: true, availableTomorrow: true, dailyCapacity: 6, priority: 4 },
  { slug: 'inverness', name: 'Inverness & Highlands', status: 'active', cityOrRegion: 'Inverness',
    postcodePrefixes: ['IV'], basePostcode: 'IV1 1QY', radiusMiles: 40,
    estimatedResponseMinutesMin: 120, estimatedResponseMinutesMax: 240, callOutFeePence: 12900,
    availableNow: false, availableToday: false, availableTomorrow: true, dailyCapacity: 2, priority: 7,
    notes: 'Highlands. Always confirm price + deposit before dispatch.' },
  { slug: 'stirling', name: 'Stirling & Forth Valley', status: 'active', cityOrRegion: 'Stirling',
    postcodePrefixes: ['FK'], basePostcode: 'FK8 1EJ', radiusMiles: 20,
    estimatedResponseMinutesMin: 45, estimatedResponseMinutesMax: 80, callOutFeePence: 5900,
    availableNow: true, availableToday: true, availableTomorrow: true, dailyCapacity: 6, priority: 3 },
  { slug: 'ayrshire', name: 'Ayrshire', status: 'active', cityOrRegion: 'Ayrshire',
    postcodePrefixes: ['KA'], basePostcode: 'KA1 1AA', radiusMiles: 25,
    estimatedResponseMinutesMin: 60, estimatedResponseMinutesMax: 100, callOutFeePence: 6900,
    availableNow: true, availableToday: true, availableTomorrow: true, dailyCapacity: 6, priority: 3 },
  { slug: 'fife', name: 'Fife', status: 'active', cityOrRegion: 'Fife',
    postcodePrefixes: ['KY'], basePostcode: 'KY1 1AA', radiusMiles: 20,
    estimatedResponseMinutesMin: 60, estimatedResponseMinutesMax: 100, callOutFeePence: 6900,
    availableNow: true, availableToday: true, availableTomorrow: true, dailyCapacity: 6, priority: 4 },
  { slug: 'borders', name: 'Scottish Borders', status: 'active', cityOrRegion: 'Borders',
    postcodePrefixes: ['TD'], basePostcode: 'TD1 1AA', radiusMiles: 30,
    estimatedResponseMinutesMin: 90, estimatedResponseMinutesMax: 180, callOutFeePence: 8900,
    availableNow: false, availableToday: true, availableTomorrow: true, dailyCapacity: 3, priority: 6 },
  { slug: 'dumfries-galloway', name: 'Dumfries & Galloway', status: 'active', cityOrRegion: 'Dumfries & Galloway',
    postcodePrefixes: ['DG'], basePostcode: 'DG1 1AA', radiusMiles: 35,
    estimatedResponseMinutesMin: 90, estimatedResponseMinutesMax: 180, callOutFeePence: 8900,
    availableNow: false, availableToday: true, availableTomorrow: true, dailyCapacity: 3, priority: 6 },
  { slug: 'perthshire', name: 'Perthshire', status: 'active', cityOrRegion: 'Perth',
    postcodePrefixes: ['PH'], basePostcode: 'PH1 5EJ', radiusMiles: 25,
    estimatedResponseMinutesMin: 75, estimatedResponseMinutesMax: 140, callOutFeePence: 7900,
    availableNow: false, availableToday: true, availableTomorrow: true, dailyCapacity: 4, priority: 5 },
  { slug: 'outer-hebrides', name: 'Outer Hebrides', status: 'unavailable', cityOrRegion: 'Outer Hebrides',
    postcodePrefixes: ['HS'], basePostcode: 'HS1 2BG', radiusMiles: 0,
    estimatedResponseMinutesMin: 0, estimatedResponseMinutesMax: 0, callOutFeePence: 0,
    availableNow: false, availableToday: false, availableTomorrow: false, dailyCapacity: 0, priority: 99,
    notes: 'Island region. Not currently dispatching.' },
  { slug: 'orkney-caithness', name: 'Orkney & Caithness', status: 'unavailable', cityOrRegion: 'Orkney & Caithness',
    postcodePrefixes: ['KW'], basePostcode: 'KW1 4AB', radiusMiles: 0,
    estimatedResponseMinutesMin: 0, estimatedResponseMinutesMax: 0, callOutFeePence: 0,
    availableNow: false, availableToday: false, availableTomorrow: false, dailyCapacity: 0, priority: 99,
    notes: 'Island / far-north region. Not currently dispatching.' },
  { slug: 'shetland', name: 'Shetland', status: 'unavailable', cityOrRegion: 'Shetland',
    postcodePrefixes: ['ZE'], basePostcode: 'ZE1 0AA', radiusMiles: 0,
    estimatedResponseMinutesMin: 0, estimatedResponseMinutesMax: 0, callOutFeePence: 0,
    availableNow: false, availableToday: false, availableTomorrow: false, dailyCapacity: 0, priority: 99,
    notes: 'Island region. Not currently dispatching.' },
];

async function main() {
  const client = await pool.connect();
  try {
    for (const stmt of ddl) {
      await client.query(stmt);
    }
    console.log(`coverage_zones table ready. Seeding ${SEED.length} zones…`);
    for (const z of SEED) {
      await client.query(
        `INSERT INTO "coverage_zones" (
           slug,name,status,city_or_region,postcode_prefixes,base_postcode,
           radius_miles,estimated_response_minutes_min,estimated_response_minutes_max,
           call_out_fee_pence,available_now,available_today,available_tomorrow,
           daily_capacity,priority,notes
         ) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (slug) DO NOTHING`,
        [
          z.slug, z.name, z.status, z.cityOrRegion,
          JSON.stringify(z.postcodePrefixes), z.basePostcode,
          z.radiusMiles, z.estimatedResponseMinutesMin, z.estimatedResponseMinutesMax,
          z.callOutFeePence, z.availableNow, z.availableToday, z.availableTomorrow,
          z.dailyCapacity, z.priority, z.notes ?? null,
        ],
      );
    }
    const { rows } = await client.query(`SELECT COUNT(*)::int AS n FROM coverage_zones`);
    console.log(`Done. Total coverage_zones rows: ${rows[0].n}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
