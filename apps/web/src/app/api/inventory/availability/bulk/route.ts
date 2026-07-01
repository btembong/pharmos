import { NextRequest, NextResponse } from 'next/server';
import * as inventoryService from '@/lib/services/inventory.service';

export async function POST(request: NextRequest) {
  try {
    const { productIds } = await request.json() as { productIds: string[] };
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ data: {} });
    }
    const ids = productIds.slice(0, 50);
    const results: Record<string, { available: number; status: string }> = {};
    await Promise.all(
      ids.map(async (id) => {
        results[id] = await inventoryService.getProductAvailability(id);
      })
    );
    return NextResponse.json({ data: results });
  } catch (error) {
    console.error('Error getting bulk availability:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
