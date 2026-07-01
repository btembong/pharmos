import { NextRequest, NextResponse } from 'next/server';
import { requireRole, isAuthError } from '@/lib/auth';
import * as productService from '@/lib/services/product.service';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole('super_admin', 'pharmacist');
    if (isAuthError(authResult)) return authResult;

    const { id } = await params;
    const body = await request.json();
    const row = await productService.updateInteraction(id, body);
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ data: row });
  } catch (error) {
    console.error('Error updating interaction:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole('super_admin', 'pharmacist');
    if (isAuthError(authResult)) return authResult;

    const { id } = await params;
    const row = await productService.deleteInteraction(id);
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ data: row });
  } catch (error) {
    console.error('Error deleting interaction:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
