import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orderItems, orders } from '@pharmaflow/db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import * as productService from '@/lib/services/product.service';

export async function GET() {
  try {
    const bestSellers = await db
      .select({
        productId: orderItems.productId,
        totalSold: sql<number>`sum(${orderItems.quantity})::int`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(
        and(
          sql`${orders.status} NOT IN ('cancelled')`,
          isNull(orders.cancelledAt)
        )
      )
      .groupBy(orderItems.productId)
      .orderBy(sql`sum(${orderItems.quantity}) DESC`)
      .limit(12);

    if (bestSellers.length === 0) {
      const result = await productService.listProducts({ isFeatured: true, limit: 12 });
      return NextResponse.json(result);
    }

    const productIds = bestSellers.map((b) => b.productId);
    const result = await productService.listProducts({ limit: 12 });
    const filtered = productIds
      .map((id) => result.data.find((p: any) => p.id === id))
      .filter(Boolean);

    return NextResponse.json({
      data: filtered.length > 0 ? filtered : result.data,
      meta: { total: filtered.length },
    });
  } catch (error) {
    console.error('Error getting best sellers:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
