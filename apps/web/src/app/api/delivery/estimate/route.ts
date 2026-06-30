import { NextRequest, NextResponse } from 'next/server';
import * as deliveryService from '@/lib/services/delivery.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const zipCode = searchParams.get('zipCode');
    const state = searchParams.get('state');
    const zoneId = searchParams.get('zoneId');

    if (zoneId) {
      const estimate = await deliveryService.calculateDeliveryEstimate(zoneId);
      if (!estimate) return NextResponse.json({ error: 'Zone not found', code: 'NOT_FOUND' }, { status: 404 });
      return NextResponse.json({ data: estimate });
    }

    let zone;
    if (zipCode) {
      zone = await deliveryService.findZoneByZip(zipCode);
    } else if (state) {
      zone = await deliveryService.findZoneByState(state);
    } else {
      return NextResponse.json({ error: 'Provide zipCode, state, or zoneId', code: 'MISSING_PARAM' }, { status: 400 });
    }

    if (!zone) {
      return NextResponse.json({ data: { available: false, message: 'Delivery not available to this location' } });
    }

    const estimate = await deliveryService.calculateDeliveryEstimate(zone.id);
    return NextResponse.json({ data: estimate });
  } catch (error) {
    console.error('Error calculating estimate:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
