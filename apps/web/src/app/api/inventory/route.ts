import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAuthError, requireRole } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit';
import * as inventoryService from '@/lib/services/inventory.service';

const listBatchesQuery = z.object({
  productId: z.string().uuid().optional(),
  isQuarantined: z.coerce.boolean().optional(),
  expiringWithinDays: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole('super_admin', 'inventory_manager', 'pharmacist');
    if (isAuthError(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());
    const parsed = listBatchesQuery.safeParse(query);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
    }

    const result = await inventoryService.listBatches(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error listing batches:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const addBatchSchema = z.object({
  productId: z.string().uuid(),
  batchNumber: z.string().min(1).max(100),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  manufactureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  quantityReceived: z.number().int().positive(),
  costPrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.string().default('USD'),
  location: z.string().max(100).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole('super_admin', 'inventory_manager');
    if (isAuthError(auth)) return auth;

    const body = await request.json();
    const parsed = addBatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 });
    }

    const batch = await inventoryService.addBatch(parsed.data);

    await writeAuditLog({
      actorId: auth.userId,
      actorType: 'staff',
      action: 'inventory.batch_added',
      entityType: 'inventory_batch',
      entityId: batch.id,
      afterState: parsed.data,
    });

    return NextResponse.json({ data: batch }, { status: 201 });
  } catch (error) {
    console.error('Error adding batch:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
