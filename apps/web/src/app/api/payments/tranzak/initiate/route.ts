import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import * as tranzak from '@/lib/services/tranzak.service';
import * as orderService from '@/lib/services/order.service';
import { db } from '@/lib/db';
import { payments } from '@pharmaflow/db/schema';
import { eq, and } from 'drizzle-orm';

const schema = z.object({
  orderNumber: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 });
    }

    const { orderNumber } = parsed.data;
    const order = await orderService.getOrderByNumber(orderNumber);
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (order.status !== 'pending_payment') {
      return NextResponse.json({ error: 'Order is not pending payment' }, { status: 400 });
    }

    // Always convert USD → XAF so TranZak shows both Card and MoMo options
    const rate = Number(process.env.TRANZAK_USD_TO_XAF_RATE || '620');
    const amount = Math.round(Number(order.totalAmount) * rate);
    const currencyCode = 'XAF';

    // Prefer VERCEL_URL (current deployment) over NEXT_PUBLIC_APP_URL (may point to production)
    const appUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
    const returnUrl = `${appUrl}/payment/tranzak/return?orderNumber=${orderNumber}`;

    const result = await tranzak.createPaymentRequest({
      amount,
      currencyCode,
      description: `Payment for order ${orderNumber}`,
      mchTransactionRef: orderNumber,
      returnUrl,
    });

    // Save requestId to DB so the return page can look it up by orderNumber
    const existing = await db.select({ id: payments.id })
      .from(payments)
      .where(and(eq(payments.orderId, order.id), eq(payments.paymentMethod, 'tranzak')))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(payments).values({
        orderId: order.id,
        customerId: order.customerId,
        amount: order.totalAmount,
        currency: currencyCode,
        status: 'pending',
        paymentMethod: 'tranzak',
        providerRef: result.requestId,
      });
    } else {
      await db.update(payments)
        .set({ providerRef: result.requestId })
        .where(eq(payments.id, existing[0].id));
    }

    return NextResponse.json({ data: { requestId: result.requestId, paymentAuthUrl: result.links.paymentAuthUrl } });
  } catch (error) {
    console.error('TranZak initiate error:', (error as Error).message);
    return NextResponse.json({ error: 'Failed to create payment request' }, { status: 500 });
  }
}
