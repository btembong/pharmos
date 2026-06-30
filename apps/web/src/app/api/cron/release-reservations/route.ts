import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { stockReservations, inventoryBatches } from '@pharmaflow/db/schema';
import { and, isNull, lt, sql, eq } from 'drizzle-orm';
import { redis } from '@/lib/redis';

export async function GET(request: NextRequest) {
  // Verify this is called by Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const expired = await db
      .select({ id: stockReservations.id, batchId: stockReservations.batchId, productId: stockReservations.productId, quantity: stockReservations.quantity })
      .from(stockReservations)
      .where(and(
        eq(stockReservations.reservationType, 'soft'),
        isNull(stockReservations.releasedAt),
        lt(stockReservations.expiresAt, new Date())
      ));

    if (expired.length === 0) return NextResponse.json({ data: { released: 0 } });

    for (const res of expired) {
      await db.update(inventoryBatches)
        .set({ quantityReserved: sql`GREATEST(quantity_reserved - ${res.quantity}, 0)` })
        .where(eq(inventoryBatches.id, res.batchId));
      await redis.del(`atp:${res.productId}`);
    }

    await db.update(stockReservations).set({ releasedAt: new Date() })
      .where(and(
        eq(stockReservations.reservationType, 'soft'),
        isNull(stockReservations.releasedAt),
        lt(stockReservations.expiresAt, new Date())
      ));

    console.log(`[cron] Released ${expired.length} expired soft reservations`);
    return NextResponse.json({ data: { released: expired.length } });
  } catch (err) {
    console.error('[cron] releaseExpiredReservations error:', err);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}
