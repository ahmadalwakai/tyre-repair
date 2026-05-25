// One-off migration: add network-derived caller location columns to
// call_click_events. UK ICO/GDPR: city-level only (no lat/lng), used for
// legitimate operational interest (admin popup context).
// Idempotent.
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
  `ALTER TABLE "call_click_events" ADD COLUMN IF NOT EXISTS "network_country" varchar(4);`,
  `ALTER TABLE "call_click_events" ADD COLUMN IF NOT EXISTS "network_region" varchar(80);`,
  `ALTER TABLE "call_click_events" ADD COLUMN IF NOT EXISTS "network_city" varchar(120);`,
];

async function main() {
  const client = await pool.connect();
  try {
    for (const sql of statements) {
      console.log('>', sql.split('\n')[0].slice(0, 100));
      await client.query(sql);
    }
    console.log('Done.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
