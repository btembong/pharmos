import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { productReviews } from '@pharmaflow/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { isAuthError, requireRole } from '@/lib/auth';

// PUT /api/products/admin/reviews/[id]/approve
export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole('super_admin', 'pharmacist');
    if (isAuthError(auth)) return auth;

    const { id } = await params;
    const [review] = await db
      .update(productReviews)
      .set({ isApproved: true })
      .where(and(eq(productReviews.id, id), isNull(productReviews.deletedAt)))
      .returning({ id: productReviews.id });

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error('Error approving review:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
