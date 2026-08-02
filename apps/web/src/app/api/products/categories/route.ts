import { NextResponse } from 'next/server';
import * as productService from '@/lib/services/product.service';

export async function GET() {
  try {
    const categories = await productService.listCategories();
    return NextResponse.json({ data: categories });
  } catch (error) {
    console.error('Error listing categories:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
