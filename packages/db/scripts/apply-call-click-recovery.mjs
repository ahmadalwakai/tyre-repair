// One-off migration: extend call_click_events with handled/acknowledged tracking + href/referrer.
// Idempotent (uses IF NOT EXISTS / duplicate_object guards).
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
  `ALTER TABLE "call_click_events" ADD COLUMN IF NOT EXISTS "href" text;`,
  `ALTER TABLE "call_click_events" ADD COLUMN IF NOT EXISTS "referrer" text;`,
  `ALTER TABLE "call_click_events" ADD COLUMN IF NOT EXISTS "acknowledged_at" timestamp with time zone;`,
  `ALTER TABLE "call_click_events" ADD COLUMN IF NOT EXISTS "acknowledged_by_admin_id" uuid;`,
  `ALTER TABLE "call_click_events" ADD COLUMN IF NOT EXISTS "handled_at" timestamp with time zone;`,
  `ALTER TABLE "call_click_events" ADD COLUMN IF NOT EXISTS "handled_by_admin_id" uuid;`,
  `ALTER TABLE "call_click_events" ADD COLUMN IF NOT EXISTS "handled_action" text;`,

  `DO $$ BEGIN
     ALTER TABLE "call_click_events"
       ADD CONSTRAINT "call_click_events_acknowledged_by_admin_id_admins_id_fk"
       FOREIGN KEY ("acknowledged_by_admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;
   EXCEPTION WHEN duplicate_object THEN null; END $$;`,

  `DO $$ BEGIN
     ALTER TABLE "call_click_events"
       ADD CONSTRAINT "call_click_events_handled_by_admin_id_admins_id_fk"
       FOREIGN KEY ("handled_by_admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;
   EXCEPTION WHEN duplicate_object THEN null; END $$;`,

  `CREATE INDEX IF NOT EXISTS "call_click_events_handled_at_idx" ON "call_click_events" ("handled_at");`,
];

try {
  for (const sql of statements) {
    console.log('Running:', sql.slice(0, 80).replace(/\s+/g, ' ') + '...');
    await pool.query(sql);
  }
  console.log('Done.');
} catch (err) {
  console.error('Migration failed:', err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
