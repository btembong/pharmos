import { NextRequest, NextResponse } from 'next/server';
import { requireRole, isAuthError } from '@/lib/auth';
import * as inventoryService from '@/lib/services/inventory.service';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRole('super_admin', 'inventory_manager');
    if (isAuthError(authResult)) return authResult;

    const { searchParams } = new URL(request.url);
    const expiryDays = Number(searchParams.get('expiryDays')) || 90;
    const expiring = await inventoryService.getExpiryAlerts(expiryDays);
    return NextResponse.json({ data: expiring });
  } catch (error) {
    console.error('Error getting expiry alerts:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
