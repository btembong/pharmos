import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import * as productService from '@/lib/services/product.service';
import { db } from '@/lib/db';
import { productReviews } from '@pharmaflow/db/schema';
import { eq, and, isNull, desc, avg, count } from 'drizzle-orm';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Support slug or UUID
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const product = UUID_REGEX.test(id)
      ? await productService.getProductById(id)
      : await productService.getProductBySlug(id);

    if (!product) {
      return NextResponse.json({ error: 'Product not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    const reviews = await db
      .select({
        id: productReviews.id,
        reviewerName: productReviews.reviewerName,
        rating: productReviews.rating,
        title: productReviews.title,
        body: productReviews.body,
        images: productReviews.images,
        isVerifiedPurchase: productReviews.isVerifiedPurchase,
        createdAt: productReviews.createdAt,
      })
      .from(productReviews)
      .where(
        and(
          eq(productReviews.productId, product.id),
          eq(productReviews.isApproved, true),
          isNull(productReviews.deletedAt)
        )
      )
      .orderBy(desc(productReviews.createdAt));

    const [stats] = await db
      .select({ avgRating: avg(productReviews.rating), totalReviews: count() })
      .from(productReviews)
      .where(
        and(
          eq(productReviews.productId, product.id),
          eq(productReviews.isApproved, true),
          isNull(productReviews.deletedAt)
        )
      );

    const breakdown = await db
      .select({ rating: productReviews.rating, count: count() })
      .from(productReviews)
      .where(
        and(
          eq(productReviews.productId, product.id),
          eq(productReviews.isApproved, true),
          isNull(productReviews.deletedAt)
        )
      )
      .groupBy(productReviews.rating);

    const ratingBreakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of breakdown) ratingBreakdown[row.rating] = Number(row.count);

    return NextResponse.json({
      data: reviews,
      meta: {
        avgRating: stats?.avgRating ? Number(Number(stats.avgRating).toFixed(1)) : 0,
        totalReviews: Number(stats?.totalReviews ?? 0),
        ratingBreakdown,
      },
    });
  } catch (error) {
    console.error('Error getting reviews:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const product = UUID_REGEX.test(id)
      ? await productService.getProductById(id)
      : await productService.getProductBySlug(id);

    if (!product) {
      return NextResponse.json({ error: 'Product not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    const body = await request.json();
    const { reviewerName, rating, title, body: reviewBody, images } = body;

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }
    if (!reviewerName?.trim()) {
      return NextResponse.json({ error: 'Reviewer name is required' }, { status: 400 });
    }

    const [review] = await db
      .insert(productReviews)
      .values({
        productId: product.id,
        reviewerName: reviewerName.trim(),
        rating: Number(rating),
        title: title?.trim() || null,
        body: reviewBody?.trim() || null,
        images: images ?? null,
        isVerifiedPurchase: false,
        isApproved: true,
      })
      .returning();

    return NextResponse.json({ data: review }, { status: 201 });
  } catch (error) {
    console.error('Error creating review:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
