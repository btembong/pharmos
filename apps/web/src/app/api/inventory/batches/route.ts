import { NextRequest, NextResponse } from 'next/server';
import { requireRole, isAuthError } from '@/lib/auth';
import { auth } from '@clerk/nextjs/server';
import * as inventoryService from '@/lib/services/inventory.service';
import { writeAuditLog } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRole('super_admin', 'inventory_manager', 'pharmacist');
    if (isAuthError(authResult)) return authResult;

    const { searchParams } = new URL(request.url);
    const filters: Record<string, unknown> = {};
    if (searchParams.get('limit')) filters.limit = Number(searchParams.get('limit'));
    if (searchParams.get('page')) filters.page = Number(searchParams.get('page'));
    if (searchParams.get('productId')) filters.productId = searchParams.get('productId');
    if (searchParams.get('isQuarantined')) filters.isQuarantined = searchParams.get('isQuarantined') === 'true';

    const result = await inventoryService.listBatches(filters as any);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error listing batches:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRole('super_admin', 'inventory_manager');
    if (isAuthError(authResult)) return authResult;

    const { userId } = await auth();
    const body = await request.json();
    const batch = await inventoryService.addBatch(body, userId ?? undefined);

    await writeAuditLog({
      actorId: userId ?? undefined,
      actorType: 'staff',
      action: 'inventory.batch_received',
      entityType: 'inventory_batch',
      entityId: batch.id,
      afterState: batch,
    });

    return NextResponse.json({ data: batch }, { status: 201 });
  } catch (error) {
    console.error('Error adding batch:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
