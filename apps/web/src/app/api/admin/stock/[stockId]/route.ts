import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, eq } from '@tyrerepair/db';
import {
  ADMIN_CHANNEL,
  triggerRealtimeEvent,
  type StockUpdatedPayload,
  type StockLowPayload,
} from '@tyrerepair/realtime';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import { safeSendAdminNotification } from '@/lib/notifications/send-admin-notification';
import { writeAuditLogSafe } from '@/lib/audit/audit-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  quantityAvailable: z.number().int().min(0).max(1_000_000).optional(),
  lowStockThreshold: z.number().int().min(0).max(1_000_000).optional(),
  reservedQuantity: z.number().int().min(0).max(1_000_000).optional(),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ stockId: string }> },
): Promise<NextResponse> {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  const { stockId } = await context.params;
  if (!z.string().uuid().safeParse(stockId).success) {
    return NextResponse.json({ error: 'Invalid stockId' }, { status: 400 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid stock update', issues: parsed.error.issues }, { status: 400 });
  }
  const d = parsed.data;
  if (
    d.quantityAvailable === undefined &&
    d.lowStockThreshold === undefined &&
    d.reservedQuantity === undefined
  ) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  let current;
  try {
    const rows = await db
      .select({
        id: schema.stock.id,
        tyreId: schema.stock.tyreId,
        quantityAvailable: schema.stock.quantityAvailable,
        lowStockThreshold: schema.stock.lowStockThreshold,
        reservedQuantity: schema.stock.reservedQuantity,
      })
      .from(schema.stock)
      .where(eq(schema.stock.id, stockId))
      .limit(1);
    current = rows[0];
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
  if (!current) {
    return NextResponse.json({ error: 'Stock not found' }, { status: 404 });
  }

  const newQty = d.quantityAvailable ?? current.quantityAvailable;
  const newReserved = d.reservedQuantity ?? current.reservedQuantity;
  const newLow = d.lowStockThreshold ?? current.lowStockThreshold;
  if (newReserved > newQty) {
    return NextResponse.json(
      { error: 'reservedQuantity must be <= quantityAvailable' },
      { status: 400 },
    );
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (d.quantityAvailable !== undefined) updates['quantityAvailable'] = d.quantityAvailable;
  if (d.lowStockThreshold !== undefined) updates['lowStockThreshold'] = d.lowStockThreshold;
  if (d.reservedQuantity !== undefined) updates['reservedQuantity'] = d.reservedQuantity;

  try {
    await db.update(schema.stock).set(updates).where(eq(schema.stock.id, stockId));
  } catch {
    return NextResponse.json({ error: 'Could not update stock' }, { status: 500 });
  }

  let tyre;
  try {
    const rows = await db
      .select({
        id: schema.tyreCatalog.id,
        sku: schema.tyreCatalog.sku,
        brand: schema.tyreCatalog.brand,
        model: schema.tyreCatalog.model,
        sizeLabel: schema.tyreCatalog.sizeLabel,
      })
      .from(schema.tyreCatalog)
      .where(eq(schema.tyreCatalog.id, current.tyreId))
      .limit(1);
    tyre = rows[0];
  } catch {
    tyre = undefined;
  }

  const now = new Date();
  if (tyre) {
    const updatedPayload: StockUpdatedPayload = {
      tyreId: tyre.id,
      sku: tyre.sku,
      quantityAvailable: newQty,
      updatedAt: now.toISOString(),
    };
    const updatedEvent = {
      type: 'stock.updated' as const,
      payload: updatedPayload,
      createdAt: now.toISOString(),
    };
    try {
      await triggerRealtimeEvent(ADMIN_CHANNEL, updatedEvent);
    } catch {
      // pusher unconfigured
    }
    await safeSendAdminNotification(updatedEvent);
    const wasOk = current.quantityAvailable > current.lowStockThreshold;
    const nowLow = newQty <= newLow;
    if (wasOk && nowLow) {      const lowPayload: StockLowPayload = {
        tyreId: tyre.id,
        sku: tyre.sku,
        sizeLabel: tyre.sizeLabel,
        brand: tyre.brand,
        model: tyre.model,
        quantityAvailable: newQty,
        lowStockThreshold: newLow,
      };
      const lowEvent = {
        type: 'stock.low' as const,
        payload: lowPayload,
        createdAt: now.toISOString(),
      };
      try {
        await triggerRealtimeEvent(ADMIN_CHANNEL, lowEvent);
      } catch {
        // pusher unconfigured
      }
      await safeSendAdminNotification(lowEvent);
    }
  }

  await writeAuditLogSafe({
    actorType: 'admin',
    action: 'stock.updated.by_admin',
    entityType: 'stock',
    entityId: stockId,
    stockId,
    actorAdminId: admin.adminId,
    actorLabel: admin.email,
    before: {
      quantityAvailable: current.quantityAvailable,
      lowStockThreshold: current.lowStockThreshold,
      reservedQuantity: current.reservedQuantity,
    },
    after: {
      quantityAvailable: newQty,
      lowStockThreshold: newLow,
      reservedQuantity: newReserved,
    },
    metadata: { tyreId: current.tyreId },
  });

  return NextResponse.json({
    success: true,
    stockId,
    quantityAvailable: newQty,
    lowStockThreshold: newLow,
    reservedQuantity: newReserved,
  });
}