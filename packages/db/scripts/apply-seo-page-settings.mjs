// One-off migration: create seo_page_settings table.
// Safe to re-run.
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
  `CREATE TABLE IF NOT EXISTS "seo_page_settings" (
     "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
     "path" varchar(240) NOT NULL UNIQUE,
     "label" varchar(160) NOT NULL,
     "title" varchar(200),
     "description" varchar(320),
     "h1" varchar(200),
     "intro" text,
     "keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
     "noindex" boolean DEFAULT false NOT NULL,
     "notes" text,
     "created_at" timestamp with time zone DEFAULT now() NOT NULL,
     "updated_at" timestamp with time zone DEFAULT now() NOT NULL
   );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "seo_page_settings_path_unique_idx" ON "seo_page_settings" ("path");`,
];

async function main() {
  const client = await pool.connect();
  try {
    for (const stmt of ddl) await client.query(stmt);
    console.log('seo_page_settings table ready.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
