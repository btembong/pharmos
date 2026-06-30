import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAuthError, requireRole } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit';
import * as orderService from '@/lib/services/order.service';
import type { OrderStatus } from '@pharmaflow/types';

const updateStatusSchema = z.object({
  status: z.enum(['confirmed', 'processing', 'packed', 'dispatched', 'out_for_delivery', 'delivered', 'cancelled']),
  note: z.string().optional(),
  trackingNumber: z.string().optional(),
  courierName: z.string().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole('super_admin', 'inventory_manager', 'pharmacist');
    if (isAuthError(auth)) return auth;

    const { id } = await params;
    const body = await request.json();
    const parsed = updateStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 });
    }

    const { status, note, trackingNumber, courierName } = parsed.data;
    const order = await orderService.updateOrderStatus(
      id,
      status as OrderStatus,
      auth.userId,
      note,
      { trackingNumber, courierName }
    );

    await writeAuditLog({
      actorId: auth.userId,
      actorType: 'staff',
      action: 'order.status_changed',
      entityType: 'order',
      entityId: id,
      afterState: { status, trackingNumber, courierName },
    });

    return NextResponse.json({ data: order });
  } catch (error) {
    const msg = (error as Error).message;
    if (msg === 'ORDER_NOT_FOUND') return NextResponse.json({ error: 'Order not found', code: 'NOT_FOUND' }, { status: 404 });
    if (msg.startsWith('INVALID_TRANSITION')) return NextResponse.json({ error: msg, code: 'INVALID_TRANSITION' }, { status: 400 });
    console.error('Error updating status:', msg);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
