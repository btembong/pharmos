import { NextRequest, NextResponse } from 'next/server';
import * as inventoryService from '@/lib/services/inventory.service';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const availability = await inventoryService.getProductAvailability(id);
    return NextResponse.json({ data: availability });
  } catch (error) {
    console.error('Error getting availability:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
