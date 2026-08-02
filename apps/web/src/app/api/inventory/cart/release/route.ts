import { NextRequest, NextResponse } from 'next/server';
import * as inventoryService from '@/lib/services/inventory.service';

export async function POST(request: NextRequest) {
  try {
    const { productId, cartSessionId } = await request.json();
    if (!productId || !cartSessionId) {
      return NextResponse.json({ error: 'productId and cartSessionId are required' }, { status: 400 });
    }
    await inventoryService.releaseSoftReservation(productId, cartSessionId);
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error('Error releasing reservation:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
