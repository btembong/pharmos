import { db } from '@/lib/db';
import {
  inventoryBatches,
  stockMovements,
  stockReservations,
  reorderRules,
  products,
} from '@pharmaflow/db/schema';
import {
  eq,
  and,
  isNull,
  gt,
  asc,
  desc,
  sql,
  lte,
  SQL,
} from 'drizzle-orm';
import { redis } from '@/lib/redis';
import type { NewInventoryBatch, NewStockMovement } from '@pharmaflow/types';

// --- Batch Management ---

interface BatchFilters {
  productId?: string;
  isQuarantined?: boolean;
  expiringWithinDays?: number;
  page?: number;
  limit?: number;
}

export async function listBatches(filters: BatchFilters = {}) {
  const { page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;

  const conditions: SQL[] = [isNull(inventoryBatches.deletedAt)];

  if (filters.productId) {
    conditions.push(eq(inventoryBatches.productId, filters.productId));
  }
  if (filters.isQuarantined !== undefined) {
    conditions.push(eq(inventoryBatches.isQuarantined, filters.isQuarantined));
  }
  if (filters.expiringWithinDays) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + filters.expiringWithinDays);
    conditions.push(lte(inventoryBatches.expiryDate, futureDate.toISOString().split('T')[0]));
  }

  const where = and(...conditions);

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(inventoryBatches)
      .where(where)
      .orderBy(asc(inventoryBatches.expiryDate))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(inventoryBatches)
      .where(where),
  ]);

  const total = Number(countResult[0].count);
  return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
}

export async function addBatch(data: NewInventoryBatch, actorId?: string) {
  const [batch] = await db
    .insert(inventoryBatches)
    .values({ ...data, quantityOnHand: data.quantityReceived })
    .returning();

  // Log the stock movement
  await db.insert(stockMovements).values({
    productId: batch.productId,
    batchId: batch.id,
    movementType: 'received',
    quantity: batch.quantityReceived,
    referenceType: 'batch_receipt',
    referenceId: batch.id,
    actorId,
  });

  // Invalidate ATP cache
  await redis.del(`atp:${batch.productId}`);

  return batch;
}

export async function updateBatch(
  id: string,
  data: { isQuarantined?: boolean; quarantineReason?: string; location?: string }
) {
  const [batch] = await db
    .update(inventoryBatches)
    .set(data)
    .where(and(eq(inventoryBatches.id, id), isNull(inventoryBatches.deletedAt)))
    .returning();

  if (batch) {
    await redis.del(`atp:${batch.productId}`);
  }

  return batch ?? null;
}

// --- FEFO Allocation ---

interface BatchAllocation {
  batchId: string;
  quantity: number;
}

export async function allocateBatchesForOrder(
  productId: string,
  quantity: number
): Promise<BatchAllocation[]> {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const batches = await db
    .select()
    .from(inventoryBatches)
    .where(
      and(
        eq(inventoryBatches.productId, productId),
        gt(inventoryBatches.quantityOnHand, 0),
        gt(inventoryBatches.expiryDate, thirtyDaysFromNow.toISOString().split('T')[0]),
        eq(inventoryBatches.isQuarantined, false),
        isNull(inventoryBatches.deletedAt)
      )
    )
    .orderBy(asc(inventoryBatches.expiryDate), asc(inventoryBatches.createdAt)); // FEFO

  let remaining = quantity;
  const allocations: BatchAllocation[] = [];

  for (const batch of batches) {
    if (remaining === 0) break;
    const available =
      Number(batch.quantityOnHand) - Number(batch.quantityReserved);
    if (available <= 0) continue;
    const allocate = Math.min(available, remaining);
    allocations.push({ batchId: batch.id, quantity: allocate });
    remaining -= allocate;
  }

  if (remaining > 0) throw new Error('INSUFFICIENT_STOCK');
  return allocations;
}

// --- Hard Reservations ---

export async function hardReserve(batchId: string, quantity: number, orderId: string) {
  // Increment reserved quantity on batch
  await db
    .update(inventoryBatches)
    .set({ quantityReserved: sql`quantity_reserved + ${quantity}` })
    .where(eq(inventoryBatches.id, batchId));

  // Record reservation row (no expiry = hard reservation)
  const [batch] = await db
    .select({ productId: inventoryBatches.productId })
    .from(inventoryBatches)
    .where(eq(inventoryBatches.id, batchId))
    .limit(1);

  await db.insert(stockReservations).values({
    productId: batch.productId,
    batchId,
    quantity,
    reservationType: 'hard',
    referenceType: 'order',
    referenceId: orderId,
  });

  // Invalidate ATP cache
  await redis.del(`atp:${batch.productId}`);
}

export async function releaseOrderReservations(orderId: string) {
  const reservations = await db
    .select()
    .from(stockReservations)
    .where(
      and(
        eq(stockReservations.referenceId, orderId),
        eq(stockReservations.reservationType, 'hard'),
        isNull(stockReservations.releasedAt)
      )
    );

  for (const res of reservations) {
    await db
      .update(inventoryBatches)
      .set({ quantityReserved: sql`GREATEST(quantity_reserved - ${res.quantity}, 0)` })
      .where(eq(inventoryBatches.id, res.batchId));

    await redis.del(`atp:${res.productId}`);
  }

  if (reservations.length > 0) {
    await db
      .update(stockReservations)
      .set({ releasedAt: new Date() })
      .where(eq(stockReservations.referenceId, orderId));
  }
}

// --- Availability ---

export async function getProductAvailability(productId: string) {
  // Check ATP cache first
  const cached = await redis.get(`atp:${productId}`);
  if (cached) return typeof cached === 'string' ? JSON.parse(cached) : cached;

  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const result = await db
    .select({
      totalOnHand: sql<number>`COALESCE(SUM(quantity_on_hand), 0)`,
      totalReserved: sql<number>`COALESCE(SUM(quantity_reserved), 0)`,
    })
    .from(inventoryBatches)
    .where(
      and(
        eq(inventoryBatches.productId, productId),
        gt(inventoryBatches.expiryDate, thirtyDaysFromNow.toISOString().split('T')[0]),
        eq(inventoryBatches.isQuarantined, false),
        isNull(inventoryBatches.deletedAt)
      )
    );

  const onHand = Number(result[0].totalOnHand);
  const reserved = Number(result[0].totalReserved);
  const available = onHand - reserved;

  const availability = {
    available,
    status: available > 10 ? 'in_stock' : available > 0 ? 'low_stock' : 'out_of_stock',
  };

  // Cache for 5 minutes
  await redis.set(`atp:${productId}`, JSON.stringify(availability), { ex: 300 });

  return availability;
}

// --- Soft Reservations (Cart) ---

const SOFT_RESERVE_TTL_MINUTES = 15;

export async function softReserve(
  productId: string,
  quantity: number,
  cartSessionId: string
): Promise<{ success: boolean; expiresAt: string }> {
  // First release any existing soft reservation for this product+session
  await releaseSoftReservation(productId, cartSessionId);

  // Allocate using FEFO
  const allocations = await allocateBatchesForOrder(productId, quantity);

  const expiresAt = new Date(Date.now() + SOFT_RESERVE_TTL_MINUTES * 60 * 1000);

  // Create soft reservations in DB
  for (const alloc of allocations) {
    await db
      .update(inventoryBatches)
      .set({ quantityReserved: sql`quantity_reserved + ${alloc.quantity}` })
      .where(eq(inventoryBatches.id, alloc.batchId));

    await db.insert(stockReservations).values({
      productId,
      batchId: alloc.batchId,
      quantity: alloc.quantity,
      reservationType: 'soft',
      referenceType: 'cart',
      referenceId: cartSessionId,
      expiresAt,
    });
  }

  // Invalidate ATP cache
  await redis.del(`atp:${productId}`);

  return { success: true, expiresAt: expiresAt.toISOString() };
}

export async function releaseSoftReservation(
  productId: string,
  cartSessionId: string
): Promise<void> {
  const existing = await db
    .select()
    .from(stockReservations)
    .where(
      and(
        eq(stockReservations.productId, productId),
        eq(stockReservations.referenceId, cartSessionId),
        eq(stockReservations.reservationType, 'soft'),
        isNull(stockReservations.releasedAt)
      )
    );

  if (existing.length === 0) return;

  for (const res of existing) {
    await db
      .update(inventoryBatches)
      .set({ quantityReserved: sql`GREATEST(quantity_reserved - ${res.quantity}, 0)` })
      .where(eq(inventoryBatches.id, res.batchId));
  }

  await db
    .update(stockReservations)
    .set({ releasedAt: new Date() })
    .where(
      and(
        eq(stockReservations.productId, productId),
        eq(stockReservations.referenceId, cartSessionId),
        eq(stockReservations.reservationType, 'soft'),
        isNull(stockReservations.releasedAt)
      )
    );

  await redis.del(`atp:${productId}`);
}

export async function releaseAllCartReservations(cartSessionId: string): Promise<void> {
  const existing = await db
    .select()
    .from(stockReservations)
    .where(
      and(
        eq(stockReservations.referenceId, cartSessionId),
        eq(stockReservations.reservationType, 'soft'),
        isNull(stockReservations.releasedAt)
      )
    );

  const productIds = new Set<string>();

  for (const res of existing) {
    await db
      .update(inventoryBatches)
      .set({ quantityReserved: sql`GREATEST(quantity_reserved - ${res.quantity}, 0)` })
      .where(eq(inventoryBatches.id, res.batchId));
    productIds.add(res.productId);
  }

  if (existing.length > 0) {
    await db
      .update(stockReservations)
      .set({ releasedAt: new Date() })
      .where(
        and(
          eq(stockReservations.referenceId, cartSessionId),
          eq(stockReservations.reservationType, 'soft'),
          isNull(stockReservations.releasedAt)
        )
      );

    for (const pid of productIds) {
      await redis.del(`atp:${pid}`);
    }
  }
}

// --- Alerts ---

export async function getLowStockAlerts() {
  const rules = await db
    .select({
      productId: reorderRules.productId,
      productName: products.name,
      reorderPoint: reorderRules.reorderPoint,
      reorderQuantity: reorderRules.reorderQuantity,
      totalOnHand: sql<number>`COALESCE(SUM(${inventoryBatches.quantityOnHand}), 0)`,
    })
    .from(reorderRules)
    .innerJoin(products, eq(products.id, reorderRules.productId))
    .leftJoin(
      inventoryBatches,
      and(
        eq(inventoryBatches.productId, reorderRules.productId),
        isNull(inventoryBatches.deletedAt),
        eq(inventoryBatches.isQuarantined, false)
      )
    )
    .groupBy(reorderRules.productId, products.name, reorderRules.reorderPoint, reorderRules.reorderQuantity)
    .having(sql`COALESCE(SUM(${inventoryBatches.quantityOnHand}), 0) <= ${reorderRules.reorderPoint}`);

  return rules;
}

export async function getExpiryAlerts(withinDays: number = 90) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + withinDays);

  return db
    .select({
      batchId: inventoryBatches.id,
      productId: inventoryBatches.productId,
      productName: products.name,
      batchNumber: inventoryBatches.batchNumber,
      expiryDate: inventoryBatches.expiryDate,
      quantityOnHand: inventoryBatches.quantityOnHand,
    })
    .from(inventoryBatches)
    .innerJoin(products, eq(products.id, inventoryBatches.productId))
    .where(
      and(
        gt(inventoryBatches.quantityOnHand, 0),
        lte(inventoryBatches.expiryDate, futureDate.toISOString().split('T')[0]),
        eq(inventoryBatches.isQuarantined, false),
        isNull(inventoryBatches.deletedAt)
      )
    )
    .orderBy(asc(inventoryBatches.expiryDate));
}
