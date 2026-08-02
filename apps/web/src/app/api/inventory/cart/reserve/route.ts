import { NextRequest, NextResponse } from 'next/server';
import * as inventoryService from '@/lib/services/inventory.service';

export async function POST(request: NextRequest) {
  try {
    const { productId, quantity, cartSessionId } = await request.json();
    if (!productId || !quantity || !cartSessionId) {
      return NextResponse.json({ error: 'productId, quantity, and cartSessionId are required' }, { status: 400 });
    }
    const result = await inventoryService.softReserve(productId, quantity, cartSessionId);
    return NextResponse.json({ data: result });
  } catch (error) {
    const msg = (error as Error).message;
    if (msg === 'INSUFFICIENT_STOCK') {
      return NextResponse.json({ error: 'Insufficient stock available', code: 'INSUFFICIENT_STOCK' }, { status: 409 });
    }
    console.error('Error reserving stock:', msg);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
