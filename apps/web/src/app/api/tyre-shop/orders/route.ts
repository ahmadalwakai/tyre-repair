import { NextResponse } from 'next/server';
import { z } from 'zod';
import { warnIfStripeEnvMissing } from '@/lib/payments/stripe';
import {
  TyreShopOrderError,
  createTyreShopOrder,
} from '@/lib/tyre-shop/orders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const fittingMethodSchema = z.union([z.literal('GARAGE'), z.literal('HOME')]);
const wheelNutSchema = z.union([z.literal('HAS_KEY'), z.literal('NO_KEY')]);

const addressSchema = z
  .object({
    line1: z.string().max(240).optional(),
    line2: z.string().max(240).optional(),
    city: z.string().max(120).optional(),
    postcode: z.string().max(16).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    formattedAddress: z.string().max(320).optional(),
  })
  .optional();

const slotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
});

const bodySchema = z.object({
  customerName: z.string().min(2).max(160),
  customerPhone: z
    .string()
    .min(7)
    .max(32)
    .regex(/^\+?[0-9 ()\-]{7,32}$/, 'Invalid phone number'),
  customerEmail: z.string().email().max(320),
  tyreCatalogId: z.string().uuid(),
  quantity: z.number().int().min(1).max(8),
  fittingMethod: fittingMethodSchema,
  address: addressSchema,
  selectedSlot: slotSchema,
  wheelNutAnswer: wheelNutSchema,
  acceptsBackorder: z.boolean().optional(),
  notes: z.string().max(1000).optional(),
});

export async function POST(req: Request): Promise<NextResponse> {
  warnIfStripeEnvMissing('POST /api/tyre-shop/orders');
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body', code: 'invalid_json' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid order input', code: 'invalid_input', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  // Hard block: NO_KEY locking wheel nut. Mirror existing checkout/session
  // behaviour. We block before touching the database or Stripe.
  if (parsed.data.wheelNutAnswer === 'NO_KEY') {
    return NextResponse.json(
      {
        error:
          'Cannot proceed to payment. Missing locking wheel nut key. Please contact us by phone.',
        code: 'locking_nut_key_missing',
      },
      { status: 409 },
    );
  }

  try {
    const data = parsed.data;
    const cleanAddress = data.address
      ? Object.fromEntries(
          Object.entries(data.address).filter(([, v]) => v !== undefined),
        )
      : undefined;
    const result = await createTyreShopOrder({
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerEmail: data.customerEmail,
      tyreCatalogId: data.tyreCatalogId,
      quantity: data.quantity,
      fittingMethod: data.fittingMethod,
      selectedSlot: data.selectedSlot,
      wheelNutAnswer: data.wheelNutAnswer,
      ...(cleanAddress ? { address: cleanAddress } : {}),
      ...(data.acceptsBackorder !== undefined ? { acceptsBackorder: data.acceptsBackorder } : {}),
      ...(data.notes ? { notes: data.notes } : {}),
    });
    return NextResponse.json(
      {
        bookingId: result.bookingId,
        trackingId: result.trackingId,
        clientSecret: result.clientSecret,
        amountGbp: result.amountGbp,
        currency: result.currency,
        totalGbp: result.totalGbp,
        isBackorder: result.isBackorder,
        expectedReadyDate: result.expectedReadyDate,
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof TyreShopOrderError) {
      // eslint-disable-next-line no-console
      console.error('[tyre-shop/orders] business error', err.code, err.message);
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    // eslint-disable-next-line no-console
    console.error('[tyre-shop/orders] server error', err);
    return NextResponse.json(
      { error: 'Could not start checkout', code: 'server_error' },
      { status: 500 },
    );
  }
}
