import { NextRequest, NextResponse } from 'next/server';
import * as orderService from '@/lib/services/order.service';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await params;
    const order = await orderService.getOrderByNumber(orderNumber);
    if (!order) return NextResponse.json({ data: null });
    const tracking = await orderService.getOrderTracking(order.id);
    return NextResponse.json({ data: tracking });
  } catch (error) {
    console.error('Chat tracking error:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
