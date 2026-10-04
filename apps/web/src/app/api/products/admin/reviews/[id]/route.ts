import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { productReviews } from '@pharmaflow/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { isAuthError, requireRole } from '@/lib/auth';

// DELETE /api/products/admin/reviews/[id] — soft delete a review
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole('super_admin');
    if (isAuthError(auth)) return auth;

    const { id } = await params;
    const [review] = await db
      .update(productReviews)
      .set({ deletedAt: new Date() })
      .where(and(eq(productReviews.id, id), isNull(productReviews.deletedAt)))
      .returning({ id: productReviews.id });

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error('Error deleting review:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
