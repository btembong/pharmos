import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { productReviews, products } from '@pharmaflow/db/schema';
import { eq, and, isNull, desc, gte } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '6'), 20);

    const reviews = await db
      .select({
        id: productReviews.id,
        reviewerName: productReviews.reviewerName,
        rating: productReviews.rating,
        title: productReviews.title,
        body: productReviews.body,
        isVerifiedPurchase: productReviews.isVerifiedPurchase,
        createdAt: productReviews.createdAt,
        productName: products.name,
        productSlug: products.slug,
      })
      .from(productReviews)
      .innerJoin(products, eq(products.id, productReviews.productId))
      .where(
        and(
          eq(productReviews.isApproved, true),
          isNull(productReviews.deletedAt),
          gte(productReviews.rating, 4)
        )
      )
      .orderBy(desc(productReviews.createdAt))
      .limit(limit);

    return NextResponse.json({ data: reviews });
  } catch (error) {
    console.error('Error fetching top reviews:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
