import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { payments, orders } from '@pharmaflow/db/schema';
import { eq, and } from 'drizzle-orm';
import * as tranzak from '@/lib/services/tranzak.service';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await params;

    // Find order
    const [order] = await db.select({ id: orders.id })
      .from(orders)
      .where(eq(orders.orderNumber, orderNumber))
      .limit(1);

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    // Find TranZak payment record
    const [payment] = await db.select({ providerRef: payments.providerRef, status: payments.status })
      .from(payments)
      .where(and(eq(payments.orderId, order.id), eq(payments.paymentMethod, 'tranzak')))
      .limit(1);

    if (!payment?.providerRef) {
      return NextResponse.json({ data: { requestId: null, status: 'NOT_FOUND' } });
    }

    // Get live status from TranZak
    const status = await tranzak.getPaymentStatus(payment.providerRef);
    return NextResponse.json({ data: { requestId: payment.providerRef, status: status.status } });
  } catch (error) {
    console.error('TranZak by-order error:', (error as Error).message);
    return NextResponse.json({ error: 'Failed to get payment status' }, { status: 500 });
  }
}
