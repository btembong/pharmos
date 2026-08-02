import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAuthError, requireRole } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit';
import * as inventoryService from '@/lib/services/inventory.service';

const updateBatchSchema = z.object({
  isQuarantined: z.boolean().optional(),
  quarantineReason: z.string().optional(),
  location: z.string().max(100).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole('super_admin', 'inventory_manager');
    if (isAuthError(auth)) return auth;

    const { id } = await params;
    const body = await request.json();
    const parsed = updateBatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 });
    }

    const batch = await inventoryService.updateBatch(id, parsed.data);

    await writeAuditLog({
      actorId: auth.userId,
      actorType: 'staff',
      action: 'inventory.batch_updated',
      entityType: 'inventory_batch',
      entityId: id,
      afterState: parsed.data,
    });

    return NextResponse.json({ data: batch });
  } catch (error) {
    console.error('Error updating batch:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
