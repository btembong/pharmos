import { NextRequest, NextResponse } from 'next/server';
import { isAuthError, requireRole } from '@/lib/auth';
import * as taxService from '@/lib/services/tax.service';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole('super_admin', 'finance');
    if (isAuthError(auth)) return auth;

    const { id } = await params;
    const result = await taxService.deleteTaxRate(id);
    if (!result) return NextResponse.json({ error: 'Tax rate not found', code: 'NOT_FOUND' }, { status: 404 });
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Error deleting tax rate:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
