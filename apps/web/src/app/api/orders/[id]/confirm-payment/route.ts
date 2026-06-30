import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAuthError, requireRole } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit';
import * as orderService from '@/lib/services/order.service';

const confirmPaymentSchema = z.object({
  paymentMethod: z.enum(['zelle', 'venmo', 'cashapp', 'wire_transfer', 'check', 'cash']),
  providerRef: z.string().min(1),
  notes: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole('super_admin', 'finance');
    if (isAuthError(auth)) return auth;

    const { id } = await params;
    const body = await request.json();
    const parsed = confirmPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 });
    }

    const payment = await orderService.confirmPayment(
      id,
      parsed.data.paymentMethod,
      parsed.data.providerRef,
      auth.userId,
      parsed.data.notes
    );

    await writeAuditLog({
      actorId: auth.userId,
      actorType: 'staff',
      action: 'payment.confirmed',
      entityType: 'payment',
      entityId: payment.id,
      afterState: payment,
    });

    return NextResponse.json({ data: payment });
  } catch (error) {
    const msg = (error as Error).message;
    if (msg === 'ORDER_NOT_FOUND') return NextResponse.json({ error: 'Order not found', code: 'NOT_FOUND' }, { status: 404 });
    if (msg === 'ORDER_NOT_PENDING_PAYMENT') return NextResponse.json({ error: 'Order is not pending payment', code: msg }, { status: 400 });
    console.error('Error confirming payment:', msg);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
