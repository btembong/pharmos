import { db } from '@/lib/db';
import {
  subscriptions,
  subscriptionOrders,
} from '@pharmaflow/db/schema';
import { eq, and, isNull, lte, sql, desc } from 'drizzle-orm';

// --- Customer-facing ---

export async function getCustomerSubscriptions(customerId: string) {
  return db.query.subscriptions.findMany({
    where: and(
      eq(subscriptions.customerId, customerId),
      isNull(subscriptions.deletedAt)
    ),
    with: { product: true, orders: { orderBy: [desc(subscriptionOrders.createdAt)], limit: 5 } },
    orderBy: [desc(subscriptions.createdAt)],
  });
}

export async function createSubscription(data: {
  customerId: string;
  productId: string;
  quantity: number;
  frequencyDays: number;
  deliveryAddressId?: string;
  discountPercent?: number;
}) {
  const nextOrderDate = new Date();
  nextOrderDate.setDate(nextOrderDate.getDate() + data.frequencyDays);

  const [sub] = await db.insert(subscriptions).values({
    customerId: data.customerId,
    productId: data.productId,
    quantity: data.quantity,
    frequencyDays: data.frequencyDays,
    nextOrderDate,
    deliveryAddressId: data.deliveryAddressId,
    discountPercent: (data.discountPercent || 5).toString(), // 5% default discount for subscribers
  }).returning();

  return sub;
}

export async function pauseSubscription(id: string, customerId: string, pauseDays = 30) {
  const pausedUntil = new Date();
  pausedUntil.setDate(pausedUntil.getDate() + pauseDays);

  const [sub] = await db
    .update(subscriptions)
    .set({ status: 'paused', pausedUntil, updatedAt: new Date() })
    .where(and(eq(subscriptions.id, id), eq(subscriptions.customerId, customerId), isNull(subscriptions.deletedAt)))
    .returning();

  return sub ?? null;
}

export async function resumeSubscription(id: string, customerId: string) {
  const nextOrderDate = new Date();
  nextOrderDate.setDate(nextOrderDate.getDate() + 1); // Next day

  const [sub] = await db
    .update(subscriptions)
    .set({ status: 'active', pausedUntil: null, nextOrderDate, updatedAt: new Date() })
    .where(and(eq(subscriptions.id, id), eq(subscriptions.customerId, customerId), isNull(subscriptions.deletedAt)))
    .returning();

  return sub ?? null;
}

export async function cancelSubscription(id: string, customerId: string, reason?: string) {
  const [sub] = await db
    .update(subscriptions)
    .set({ status: 'cancelled', cancellationReason: reason || null, updatedAt: new Date() })
    .where(and(eq(subscriptions.id, id), eq(subscriptions.customerId, customerId), isNull(subscriptions.deletedAt)))
    .returning();

  return sub ?? null;
}

export async function updateSubscription(id: string, customerId: string, data: {
  quantity?: number;
  frequencyDays?: number;
  deliveryAddressId?: string;
}) {
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (data.quantity) updateData.quantity = data.quantity;
  if (data.frequencyDays) updateData.frequencyDays = data.frequencyDays;
  if (data.deliveryAddressId) updateData.deliveryAddressId = data.deliveryAddressId;

  const [sub] = await db
    .update(subscriptions)
    .set(updateData)
    .where(and(eq(subscriptions.id, id), eq(subscriptions.customerId, customerId), isNull(subscriptions.deletedAt)))
    .returning();

  return sub ?? null;
}

// --- Cron: Process due subscriptions ---

export async function getDueSubscriptions() {
  return db.query.subscriptions.findMany({
    where: and(
      eq(subscriptions.status, 'active'),
      lte(subscriptions.nextOrderDate, new Date()),
      isNull(subscriptions.deletedAt)
    ),
    with: { customer: true, product: true },
  });
}

export async function recordSubscriptionOrder(
  subscriptionId: string,
  status: 'created' | 'failed' | 'skipped',
  orderId?: string,
  failureReason?: string
) {
  await db.insert(subscriptionOrders).values({
    subscriptionId,
    orderId: orderId || null,
    status,
    scheduledDate: new Date(),
    processedAt: new Date(),
    failureReason: failureReason || null,
  });

  // Update subscription
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (status === 'created') {
    updateData.lastOrderDate = new Date();
    updateData.totalOrders = sql`total_orders + 1`;
  }

  // Calculate next order date
  const [sub] = await db.select({ frequencyDays: subscriptions.frequencyDays }).from(subscriptions).where(eq(subscriptions.id, subscriptionId));
  if (sub) {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + sub.frequencyDays);
    updateData.nextOrderDate = nextDate;
  }

  await db.update(subscriptions).set(updateData).where(eq(subscriptions.id, subscriptionId));
}

// --- Admin ---

export async function listAllSubscriptions(page = 1, limit = 20) {
  const offset = (page - 1) * limit;

  const [data, countResult] = await Promise.all([
    db.query.subscriptions.findMany({
      where: isNull(subscriptions.deletedAt),
      with: { customer: true, product: true },
      orderBy: [desc(subscriptions.createdAt)],
      limit,
      offset,
    }),
    db.select({ count: sql<number>`count(*)` }).from(subscriptions).where(isNull(subscriptions.deletedAt)),
  ]);

  const total = Number(countResult[0].count);
  return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
}
