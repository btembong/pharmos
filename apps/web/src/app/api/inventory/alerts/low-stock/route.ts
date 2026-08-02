import { NextResponse } from 'next/server';
import { requireRole, isAuthError } from '@/lib/auth';
import * as inventoryService from '@/lib/services/inventory.service';

export async function GET() {
  try {
    const authResult = await requireRole('super_admin', 'inventory_manager');
    if (isAuthError(authResult)) return authResult;

    const lowStock = await inventoryService.getLowStockAlerts();
    return NextResponse.json({ data: lowStock });
  } catch (error) {
    console.error('Error getting low stock alerts:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
