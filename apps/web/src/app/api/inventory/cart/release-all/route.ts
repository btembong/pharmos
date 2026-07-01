import { NextRequest, NextResponse } from 'next/server';
import * as inventoryService from '@/lib/services/inventory.service';

export async function POST(request: NextRequest) {
  try {
    const { cartSessionId } = await request.json();
    if (!cartSessionId) {
      return NextResponse.json({ error: 'cartSessionId is required' }, { status: 400 });
    }
    await inventoryService.releaseAllCartReservations(cartSessionId);
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error('Error releasing all reservations:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
