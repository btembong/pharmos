import { NextRequest, NextResponse } from 'next/server';
import * as productService from '@/lib/services/product.service';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Return related products as recommendations
    const result = await productService.listProducts({ limit: 6 });
    const recommendations = result.data.filter((p: any) => p.id !== id).slice(0, 4);
    return NextResponse.json({ data: recommendations });
  } catch (error) {
    console.error('Error getting recommendations:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
