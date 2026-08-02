import { NextRequest, NextResponse } from 'next/server';
import * as orderService from '@/lib/services/order.service';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tracking = await orderService.getOrderTracking(id);
    if (!tracking) {
      return NextResponse.json({ error: 'Order not found', code: 'NOT_FOUND' }, { status: 404 });
    }
    return NextResponse.json({ data: tracking });
  } catch (error) {
    console.error('Error getting tracking:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
