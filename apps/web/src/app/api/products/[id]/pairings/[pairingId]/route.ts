import { NextRequest, NextResponse } from 'next/server';
import { requireRole, isAuthError } from '@/lib/auth';
import { db } from '@/lib/db';
import { productPairings } from '@pharmaflow/db/schema';
import { eq } from 'drizzle-orm';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; pairingId: string }> }
) {
  try {
    const authResult = await requireRole('super_admin', 'inventory_manager');
    if (isAuthError(authResult)) return authResult;

    const { pairingId } = await params;
    await db.delete(productPairings).where(eq(productPairings.id, pairingId));

    return NextResponse.json({ data: { message: 'Pairing removed' } });
  } catch (error) {
    console.error('Error deleting pairing:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
