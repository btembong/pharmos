import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import * as tranzak from '@/lib/services/tranzak.service';
import * as orderService from '@/lib/services/order.service';

const schema = z.object({
  orderNumber: z.string().min(1),
  currencyCode: z.string().length(3).default('XAF'),
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

    const { orderNumber, currencyCode } = parsed.data;
    const order = await orderService.getOrderByNumber(orderNumber);
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (order.status !== 'pending_payment') {
      return NextResponse.json({ error: 'Order is not pending payment' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    const returnUrl = `${appUrl}/payment/tranzak/return?orderNumber=${orderNumber}`;

    const result = await tranzak.createPaymentRequest({
      amount: Number(order.totalAmount),
      currencyCode,
      description: `Payment for order ${orderNumber}`,
      mchTransactionRef: orderNumber,
      returnUrl,
    });

    return NextResponse.json({ data: { requestId: result.requestId, paymentAuthUrl: result.links.paymentAuthUrl } });
  } catch (error) {
    console.error('TranZak initiate error:', (error as Error).message);
    return NextResponse.json({ error: 'Failed to create payment request' }, { status: 500 });
  }
}
