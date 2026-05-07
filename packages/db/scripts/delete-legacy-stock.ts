/**
 * One-off cleanup: delete legacy seed tyres (SKUs matching '%-001').
 * Safe — bookings/quotes/booking_adjustments have ON DELETE SET NULL on tyre_id;
 * stock has ON DELETE CASCADE.
 */
import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db } from '../src/client';
import { tyreCatalog } from '../src/schema';

async function main(): Promise<void> {
  const before = await db.select({ id: tyreCatalog.id, sku: tyreCatalog.sku })
    .from(tyreCatalog)
    .where(sql`${tyreCatalog.sku} LIKE '%-001'`);
  console.log(`Found ${before.length} legacy catalogue rows to delete.`);
  if (before.length === 0) {
    process.exit(0);
  }
  for (const row of before) {
    console.log(`  - ${row.sku}`);
  }
  const result = await db.delete(tyreCatalog)
    .where(sql`${tyreCatalog.sku} LIKE '%-001'`)
    .returning({ id: tyreCatalog.id });
  console.log(`Deleted ${result.length} catalogue rows (stock cascaded).`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Cleanup failed:', err);
    process.exit(1);
  });
