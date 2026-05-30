import 'dotenv/config';
import { neonConfig, Pool } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;
const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL not set'); process.exit(1); }

const pool = new Pool({ connectionString: url });
const { rows } = await pool.query(`
  SELECT tc.size_label, tc.brand, tc.model, tc.tier, tc.type,
         tc.base_price_gbp,
         COALESCE(s.quantity_available, 0) AS qty,
         COALESCE(s.reserved_quantity, 0) AS reserved,
         COALESCE(s.quantity_available, 0) - COALESCE(s.reserved_quantity, 0) AS effective
  FROM tyre_catalog tc
  LEFT JOIN stock s ON s.tyre_id = tc.id
  WHERE tc.is_active = true
  ORDER BY (COALESCE(s.quantity_available, 0) - COALESCE(s.reserved_quantity, 0)) DESC,
           tc.size_label, tc.brand
`);

const inStock = rows.filter(r => r.effective > 0 && r.tier === 'budget' && r.type === 'all_season');
const backorder = rows.filter(r => !(r.effective > 0 && r.tier === 'budget' && r.type === 'all_season'));

console.log('=== IN STOCK (' + inStock.length + ') ===');
for (const r of inStock) {
  console.log(`${r.size_label} | ${r.brand} ${r.model} | ${r.tier}/${r.type} | £${r.base_price_gbp} | qty:${r.effective}`);
}
console.log('\n=== BACKORDER / OUT OF STOCK (' + backorder.length + ') ===');
for (const r of backorder) {
  console.log(`${r.size_label} | ${r.brand} ${r.model} | ${r.tier}/${r.type} | £${r.base_price_gbp}`);
}
await pool.end();
