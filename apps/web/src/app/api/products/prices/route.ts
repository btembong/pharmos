import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { requireRole, isAuthError } from '@/lib/auth';
import * as productService from '@/lib/services/product.service';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRole('super_admin', 'inventory_manager');
    if (isAuthError(authResult)) return authResult;

    const body = await request.json();
    const price = await productService.setProductPrice(body);
    return NextResponse.json({ data: price }, { status: 201 });
  } catch (error) {
    console.error('Error setting price:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
