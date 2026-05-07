import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, eq } from '@tyrerepair/db';
import {
  ADMIN_CHANNEL,
  triggerRealtimeEvent,
  type StockUpdatedPayload,
} from '@tyrerepair/realtime';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import { safeSendAdminNotification } from '@/lib/notifications/send-admin-notification';
import { writeAuditLogSafe } from '@/lib/audit/audit-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  csvText: z.string().min(1).max(2_000_000),
});

interface RowResult {
  rowNumber: number;
  sku: string;
  ok: boolean;
  message?: string;
}

interface ParsedRow {
  rowNumber: number;
  sku: string;
  quantityAvailable: number;
  lowStockThreshold: number | null;
}

function parseCsv(csvText: string): { rows: ParsedRow[]; errors: string[] } {
  const errors: string[] = [];
  const rows: ParsedRow[] = [];
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) {
    errors.push('CSV is empty');
    return { rows, errors };
  }
  const headerLine = lines[0];
  if (!headerLine) {
    errors.push('CSV has no header row');
    return { rows, errors };
  }
  const header = headerLine.split(',').map((c) => c.trim().toLowerCase());
  const skuIdx = header.indexOf('sku');
  const qtyIdx = header.indexOf('quantityavailable');
  const lowIdx = header.indexOf('lowstockthreshold');
  if (skuIdx === -1 || qtyIdx === -1) {
    errors.push('CSV header must include sku and quantityAvailable');
    return { rows, errors };
  }
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const cols = line.split(',').map((c) => c.trim());
    const sku = cols[skuIdx];
    const qtyStr = cols[qtyIdx];
    if (!sku || !qtyStr) {
      errors.push(`Row ${i + 1}: missing sku or quantityAvailable`);
      continue;
    }
    const qty = Number(qtyStr);
    if (!Number.isInteger(qty) || qty < 0 || qty > 1_000_000) {
      errors.push(`Row ${i + 1}: invalid quantityAvailable "${qtyStr}"`);
      continue;
    }
    let low: number | null = null;
    if (lowIdx >= 0) {
      const lowStr = cols[lowIdx];
      if (lowStr && lowStr.length > 0) {
        const lowN = Number(lowStr);
        if (!Number.isInteger(lowN) || lowN < 0 || lowN > 1_000_000) {
          errors.push(`Row ${i + 1}: invalid lowStockThreshold "${lowStr}"`);
          continue;
        }
        low = lowN;
      }
    }
    rows.push({ rowNumber: i + 1, sku, quantityAvailable: qty, lowStockThreshold: low });
  }
  return { rows, errors };
}

export async function POST(req: Request): Promise<NextResponse> {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { rows, errors } = parseCsv(parsed.data.csvText);
  if (errors.length > 0) {
    return NextResponse.json({ error: 'Validation failed', errors }, { status: 400 });
  }
  if (rows.length === 0) {
    return NextResponse.json({ error: 'No data rows' }, { status: 400 });
  }

  const results: RowResult[] = [];
  let updated = 0;

  for (const row of rows) {
    try {
      const tyreRows = await db
        .select({ id: schema.tyreCatalog.id, sku: schema.tyreCatalog.sku })
        .from(schema.tyreCatalog)
        .where(eq(schema.tyreCatalog.sku, row.sku))
        .limit(1);
      const tyre = tyreRows[0];
      if (!tyre) {
        results.push({ rowNumber: row.rowNumber, sku: row.sku, ok: false, message: 'SKU not found' });
        continue;
      }
      const stockRows = await db
        .select({
          id: schema.stock.id,
          reservedQuantity: schema.stock.reservedQuantity,
        })
        .from(schema.stock)
        .where(eq(schema.stock.tyreId, tyre.id))
        .limit(1);
      const stockRow = stockRows[0];
      if (!stockRow) {
        results.push({ rowNumber: row.rowNumber, sku: row.sku, ok: false, message: 'No stock row' });
        continue;
      }
      if (row.quantityAvailable < stockRow.reservedQuantity) {
        results.push({
          rowNumber: row.rowNumber,
          sku: row.sku,
          ok: false,
          message: 'quantityAvailable would be less than reservedQuantity',
        });
        continue;
      }
      const updates: Record<string, unknown> = {
        quantityAvailable: row.quantityAvailable,
        updatedAt: new Date(),
      };
      if (row.lowStockThreshold !== null) updates['lowStockThreshold'] = row.lowStockThreshold;
      await db.update(schema.stock).set(updates).where(eq(schema.stock.id, stockRow.id));
      updated += 1;
      results.push({ rowNumber: row.rowNumber, sku: row.sku, ok: true });

      if (updated <= 20) {
        const payload: StockUpdatedPayload = {
          tyreId: tyre.id,
          sku: tyre.sku,
          quantityAvailable: row.quantityAvailable,
          updatedAt: new Date().toISOString(),
        };
        const event = {
          type: 'stock.updated' as const,
          payload,
          createdAt: new Date().toISOString(),
        };
        try {
          await triggerRealtimeEvent(ADMIN_CHANNEL, event);
        } catch {
          // pusher unconfigured
        }
        await safeSendAdminNotification(event);
      }
    } catch {
      results.push({ rowNumber: row.rowNumber, sku: row.sku, ok: false, message: 'Server error' });
    }
  }

  const skipped = results.filter((r) => !r.ok).length;

  await writeAuditLogSafe({
    actorType: 'admin',
    action: 'stock.csv.imported',
    entityType: 'stock',
    actorAdminId: admin.adminId,
    actorLabel: admin.email,
    metadata: { updated, skipped, totalRows: rows.length },
  });

  return NextResponse.json({ updated, skipped, results });
}
