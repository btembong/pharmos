import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { productReviews, products } from '@pharmaflow/db/schema';
import { and, eq, isNull, desc, sql } from 'drizzle-orm';
import { isAuthError, requireRole } from '@/lib/auth';

// GET /api/products/admin/reviews — list all reviews for moderation
export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole('super_admin', 'pharmacist');
    if (isAuthError(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'pending' | 'approved' | 'all'
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '50'));
    const offset = (page - 1) * limit;

    const conditions: any[] = [isNull(productReviews.deletedAt)];
    if (status === 'pending') {
      conditions.push(eq(productReviews.isApproved, false));
    } else if (status === 'approved') {
      conditions.push(eq(productReviews.isApproved, true));
    }

    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          id: productReviews.id,
          reviewerName: productReviews.reviewerName,
          rating: productReviews.rating,
          title: productReviews.title,
          body: productReviews.body,
          isVerifiedPurchase: productReviews.isVerifiedPurchase,
          isApproved: productReviews.isApproved,
          createdAt: productReviews.createdAt,
          productId: productReviews.productId,
          productName: products.name,
          productSlug: products.slug,
        })
        .from(productReviews)
        .innerJoin(products, eq(productReviews.productId, products.id))
        .where(and(...conditions))
        .orderBy(desc(productReviews.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(productReviews)
        .where(and(...conditions)),
    ]);

    return NextResponse.json({ data: rows, meta: { total, page, limit } });
  } catch (error) {
    console.error('Error listing reviews:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
