import { NextResponse } from 'next/server';
import * as deliveryService from '@/lib/services/delivery.service';

export async function GET() {
  try {
    const zones = await deliveryService.listDeliveryZones();
    return NextResponse.json({ data: zones });
  } catch (error) {
    console.error('Error listing zones:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
