import { NextRequest, NextResponse } from 'next/server';
import * as orderService from '@/lib/services/order.service';
import { writeAuditLog } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verify this is from our TranZak app
    if (body.appId !== process.env.TRANZAK_APP_ID) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (body.eventType !== 'REQUEST.COMPLETED') {
      return NextResponse.json({ data: { received: true } });
    }

    const resource = body.resource;
    if (!resource || resource.status !== 'SUCCESSFUL') {
      return NextResponse.json({ data: { received: true } });
    }

    // mchTransactionRef is the orderNumber we passed during initiation
    const orderNumber = resource.mchTransactionRef as string | undefined;
    const requestId = resource.requestId as string;
    const transactionId = resource.transactionId as string;

    if (!orderNumber) {
      console.error('[tranzak webhook] Missing mchTransactionRef in payload');
      return NextResponse.json({ data: { received: true } });
    }

    const order = await orderService.getOrderByNumber(orderNumber);
    if (!order) {
      console.error(`[tranzak webhook] Order not found: ${orderNumber}`);
      return NextResponse.json({ data: { received: true } });
    }

    if (order.status !== 'pending_payment') {
      // Already confirmed — idempotent
      return NextResponse.json({ data: { received: true } });
    }

    await orderService.confirmPayment(
      order.id,
      'tranzak',
      transactionId || requestId,
      'tranzak_webhook',
      `TranZak requestId: ${requestId}`
    );

    await writeAuditLog({
      actorType: 'system',
      action: 'payment.confirmed',
      entityType: 'order',
      entityId: order.id,
      afterState: { paymentMethod: 'tranzak', transactionId, requestId },
    });

    return NextResponse.json({ data: { received: true } });
  } catch (error) {
    console.error('[tranzak webhook] Error:', (error as Error).message);
    // Return 200 so TranZak doesn't keep retrying on non-payment errors
    return NextResponse.json({ data: { received: true } });
  }
}
