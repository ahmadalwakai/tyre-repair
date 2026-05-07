// One-off migration: apply emergency_assist_events table + drop unused location_request_tokens.
// Safe to re-run (uses IF NOT EXISTS / IF EXISTS guards).
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
  `DO $$ BEGIN
     CREATE TYPE "public"."emergency_assist_status" AS ENUM('NEW','ACKNOWLEDGED','CONTINUED_TO_LOCATION','CONVERTED_TO_QUOTE','EXPIRED');
   EXCEPTION WHEN duplicate_object THEN null; END $$;`,

  `CREATE TABLE IF NOT EXISTS "emergency_assist_events" (
     "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
     "anonymous_session_id" varchar(160),
     "quote_progress_id" varchar(160),
     "visitor_id" uuid,
     "source" varchar(64) DEFAULT 'QUOTE_EMERGENCY_BUTTON' NOT NULL,
     "page" varchar(240) DEFAULT '/quote' NOT NULL,
     "status" "emergency_assist_status" DEFAULT 'NEW' NOT NULL,
     "vehicle_registration" varchar(32),
     "tyre_problem_type" "tyre_problem_type",
     "job_type" "quote_job_type",
     "customer_phone" varchar(32),
     "location_label" varchar(240),
     "latitude" numeric(10,7),
     "longitude" numeric(10,7),
     "user_agent" text,
     "referrer" text,
     "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
     "acknowledged_at" timestamp with time zone,
     "acknowledged_by_admin_id" uuid,
     "created_at" timestamp with time zone DEFAULT now() NOT NULL,
     "updated_at" timestamp with time zone DEFAULT now() NOT NULL
   );`,

  `DO $$ BEGIN
     ALTER TABLE "emergency_assist_events"
       ADD CONSTRAINT "emergency_assist_events_visitor_id_live_visitors_id_fk"
       FOREIGN KEY ("visitor_id") REFERENCES "public"."live_visitors"("id") ON DELETE set null ON UPDATE no action;
   EXCEPTION WHEN duplicate_object THEN null; END $$;`,

  `DO $$ BEGIN
     ALTER TABLE "emergency_assist_events"
       ADD CONSTRAINT "emergency_assist_events_acknowledged_by_admin_id_admins_id_fk"
       FOREIGN KEY ("acknowledged_by_admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;
   EXCEPTION WHEN duplicate_object THEN null; END $$;`,

  `CREATE INDEX IF NOT EXISTS "emergency_assist_events_status_idx" ON "emergency_assist_events" ("status");`,
  `CREATE INDEX IF NOT EXISTS "emergency_assist_events_created_at_idx" ON "emergency_assist_events" ("created_at");`,
  `CREATE INDEX IF NOT EXISTS "emergency_assist_events_phone_idx" ON "emergency_assist_events" ("customer_phone");`,

  `DROP TABLE IF EXISTS "location_request_tokens" CASCADE;`,
];

try {
  for (const sql of statements) {
    process.stdout.write('Running: ' + sql.split('\n')[0].slice(0, 80) + '...\n');
    await pool.query(sql);
  }
  console.log('Done.');
} catch (err) {
  console.error('Failed:', err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
