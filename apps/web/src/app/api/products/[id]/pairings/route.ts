import { NextRequest, NextResponse } from 'next/server';
import { requireRole, isAuthError } from '@/lib/auth';
import { db } from '@/lib/db';
import { productPairings, products } from '@pharmaflow/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole('super_admin', 'inventory_manager');
    if (isAuthError(authResult)) return authResult;

    const { id } = await params;
    const rows = await db
      .select({
        id: productPairings.id,
        pairedProductId: productPairings.pairedProductId,
        sortOrder: productPairings.sortOrder,
        pairedName: products.name,
        pairedSlug: products.slug,
      })
      .from(productPairings)
      .innerJoin(products, eq(products.id, productPairings.pairedProductId))
      .where(eq(productPairings.productId, id))
      .orderBy(asc(productPairings.sortOrder));

    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error('Error listing pairings:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole('super_admin', 'inventory_manager');
    if (isAuthError(authResult)) return authResult;

    const { id } = await params;
    const { pairedProductId, sortOrder = 0 } = await request.json();

    const [pairing] = await db
      .insert(productPairings)
      .values({ productId: id, pairedProductId, sortOrder })
      .returning();

    return NextResponse.json({ data: pairing }, { status: 201 });
  } catch (error) {
    console.error('Error creating pairing:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
