import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { productReviews, products } from '@pharmaflow/db/schema';
import { eq, and, isNull, desc, sql, gte, avg, count } from 'drizzle-orm';

// GET /api/reviews — all approved reviews (paginated) + aggregate stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '20'));
    const offset = (page - 1) * limit;
    const rating = searchParams.get('rating'); // '5' | '4' | etc.
    const productSlug = searchParams.get('product');

    const conditions: any[] = [
      eq(productReviews.isApproved, true),
      isNull(productReviews.deletedAt),
    ];

    if (rating) {
      conditions.push(eq(productReviews.rating, parseInt(rating)));
    }

    // Join + optional product filter
    const baseQuery = db
      .select({
        id: productReviews.id,
        reviewerName: productReviews.reviewerName,
        rating: productReviews.rating,
        title: productReviews.title,
        body: productReviews.body,
        isVerifiedPurchase: productReviews.isVerifiedPurchase,
        createdAt: productReviews.createdAt,
        productId: productReviews.productId,
        productName: products.name,
        productSlug: products.slug,
      })
      .from(productReviews)
      .innerJoin(products, eq(products.id, productReviews.productId));

    if (productSlug) {
      conditions.push(eq(products.slug, productSlug));
    }

    const [rows, [{ total }], [stats]] = await Promise.all([
      baseQuery
        .where(and(...conditions))
        .orderBy(desc(productReviews.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(productReviews)
        .innerJoin(products, eq(products.id, productReviews.productId))
        .where(and(...conditions)),
      // Aggregate stats (no pagination filters — always across all approved reviews)
      db
        .select({
          avgRating: avg(productReviews.rating),
          totalReviews: count(),
        })
        .from(productReviews)
        .where(and(eq(productReviews.isApproved, true), isNull(productReviews.deletedAt))),
    ]);

    // Rating breakdown
    const breakdown = await db
      .select({
        rating: productReviews.rating,
        cnt: sql<number>`count(*)::int`,
      })
      .from(productReviews)
      .where(and(eq(productReviews.isApproved, true), isNull(productReviews.deletedAt)))
      .groupBy(productReviews.rating);

    const ratingBreakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of breakdown) ratingBreakdown[row.rating] = row.cnt;

    return NextResponse.json({
      data: rows,
      meta: {
        total,
        page,
        limit,
        avgRating: stats?.avgRating ? Number(Number(stats.avgRating).toFixed(1)) : 0,
        totalReviews: Number(stats?.totalReviews ?? 0),
        ratingBreakdown,
      },
    });
  } catch (error) {
    console.error('Error fetching reviews:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
