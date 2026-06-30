import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAuthError, requireAuth, requireRole } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit';
import * as productService from '@/lib/services/product.service';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await productService.getProductById(id);
    if (!product) {
      return NextResponse.json({ error: 'Product not found', code: 'NOT_FOUND' }, { status: 404 });
    }
    return NextResponse.json({ data: product });
  } catch (error) {
    console.error('Error getting product:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole('super_admin', 'inventory_manager');
    if (isAuthError(auth)) return auth;

    const { id } = await params;
    const body = await request.json();
    const product = await productService.updateProduct(id, body);

    await writeAuditLog({
      actorId: auth.userId,
      actorType: 'staff',
      action: 'product.updated',
      entityType: 'product',
      entityId: id,
      afterState: body,
    });

    return NextResponse.json({ data: product });
  } catch (error) {
    console.error('Error updating product:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole('super_admin');
    if (isAuthError(auth)) return auth;

    const { id } = await params;
    await productService.softDeleteProduct(id);

    await writeAuditLog({
      actorId: auth.userId,
      actorType: 'staff',
      action: 'product.deleted',
      entityType: 'product',
      entityId: id,
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error('Error deleting product:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
