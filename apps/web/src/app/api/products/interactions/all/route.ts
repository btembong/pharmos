import { NextRequest, NextResponse } from 'next/server';
import { requireRole, isAuthError } from '@/lib/auth';
import * as productService from '@/lib/services/product.service';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRole('super_admin', 'pharmacist');
    if (isAuthError(authResult)) return authResult;

    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 50;
    const result = await productService.listInteractions(page, limit);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error listing interactions:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
