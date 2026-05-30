// One-off migration: create admin_price_overrides table for the
// "admin edits the suggested Quick Booking price" feature. Safe to re-run.
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

const statements = [
  `CREATE TABLE IF NOT EXISTS "admin_price_overrides" (
     "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
     "booking_id" uuid,
     "created_by_admin_id" uuid,
     "job_type" varchar(32) NOT NULL,
     "tyre_problem_type" varchar(32),
     "tyre_id" uuid,
     "distance_bucket" integer,
     "engine_total_gbp" numeric(10,2) NOT NULL,
     "admin_total_gbp" numeric(10,2) NOT NULL,
     "adjustment_multiplier" numeric(10,4) NOT NULL,
     "created_at" timestamp with time zone DEFAULT now() NOT NULL,
     CONSTRAINT "admin_price_overrides_multiplier_positive" CHECK ("adjustment_multiplier" > 0)
   );`,

  `DO $$ BEGIN
     ALTER TABLE "admin_price_overrides"
       ADD CONSTRAINT "admin_price_overrides_booking_id_fk"
       FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null;
   EXCEPTION WHEN duplicate_object THEN null; END $$;`,

  `DO $$ BEGIN
     ALTER TABLE "admin_price_overrides"
       ADD CONSTRAINT "admin_price_overrides_admin_id_fk"
       FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."admins"("id") ON DELETE set null;
   EXCEPTION WHEN duplicate_object THEN null; END $$;`,

  `DO $$ BEGIN
     ALTER TABLE "admin_price_overrides"
       ADD CONSTRAINT "admin_price_overrides_tyre_id_fk"
       FOREIGN KEY ("tyre_id") REFERENCES "public"."tyre_catalog"("id") ON DELETE set null;
   EXCEPTION WHEN duplicate_object THEN null; END $$;`,

  `CREATE INDEX IF NOT EXISTS "admin_price_overrides_lookup_idx"
     ON "admin_price_overrides"
     USING btree ("job_type","tyre_problem_type","distance_bucket","created_at");`,

  `CREATE INDEX IF NOT EXISTS "admin_price_overrides_created_at_idx"
     ON "admin_price_overrides"
     USING btree ("created_at");`,
];

const client = await pool.connect();
try {
  for (const sql of statements) {
    process.stdout.write(`Applying: ${sql.split('\n')[0].slice(0, 80)}…\n`);
    await client.query(sql);
  }
  console.log('admin_price_overrides migration complete.');
} finally {
  client.release();
  await pool.end();
}
