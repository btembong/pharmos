import { NextRequest, NextResponse } from 'next/server';
import { isAuthError, requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { paymentMethods } from '@pharmaflow/db/schema';
import { eq } from 'drizzle-orm';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole('super_admin');
    if (isAuthError(auth)) return auth;

    const { id } = await params;
    const deleted = await db.delete(paymentMethods)
      .where(eq(paymentMethods.id, id))
      .returning({ id: paymentMethods.id });

    if (deleted.length === 0) {
      return NextResponse.json({ error: 'Payment method not found' }, { status: 404 });
    }

    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    console.error('Error deleting payment method:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
