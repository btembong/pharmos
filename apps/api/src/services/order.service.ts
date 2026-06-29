import { db } from '../lib/db';
import {
  orders,
  orderItems,
  orderStatusHistory,
  payments,
} from '@pharmaflow/db/schema';
import { eq, and, desc, gte, lte, sql, SQL } from 'drizzle-orm';
import type { NewOrder, NewOrderItem, OrderStatus } from '@pharmaflow/types';
import { notificationService } from './notification.service';
import { getTrackingUrl } from './delivery.service';

// --- Order Queries ---

interface OrderFilters {
  status?: string;
  customerId?: string;
  paymentStatus?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

export async function listOrders(filters: OrderFilters = {}) {
  const { page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;

  const conditions: SQL[] = [];
  if (filters.status) conditions.push(eq(orders.status, filters.status));
  if (filters.customerId) conditions.push(eq(orders.customerId, filters.customerId));
  if (filters.paymentStatus) conditions.push(eq(orders.paymentStatus, filters.paymentStatus));
  if (filters.from) conditions.push(gte(orders.createdAt, filters.from));
  if (filters.to) conditions.push(lte(orders.createdAt, filters.to));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, countResult] = await Promise.all([
    db.query.orders.findMany({
      where,
      with: { items: true, customer: true, deliveryAddress: true },
      orderBy: [desc(orders.createdAt)],
      limit,
      offset,
    }),
    db.select({ count: sql<number>`count(*)` }).from(orders).where(where),
  ]);

  const total = Number(countResult[0].count);
  return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
}

export async function getOrderById(id: string) {
  return db.query.orders.findFirst({
    where: eq(orders.id, id),
    with: {
      items: true,
      customer: true,
      deliveryAddress: true,
      statusHistory: { orderBy: [desc(orderStatusHistory.createdAt)] },
    },
  }) ?? null;
}

export async function getOrderByNumber(orderNumber: string) {
  return db.query.orders.findFirst({
    where: eq(orders.orderNumber, orderNumber),
    with: {
      items: true,
      customer: true,
      deliveryAddress: true,
      statusHistory: { orderBy: [desc(orderStatusHistory.createdAt)] },
    },
  }) ?? null;
}

// --- Order Creation ---

export async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const result = await db.execute(
    sql`SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 9) AS INTEGER)), 0) + 1 as seq FROM orders WHERE order_number LIKE ${`PF-${year}-%`}`
  );
  const seq = Number((result as any).rows?.[0]?.seq ?? 1);
  return `PF-${year}-${String(seq).padStart(6, '0')}`;
}

export async function createOrder(data: NewOrder, items: NewOrderItem[]) {
  const orderNumber = await generateOrderNumber();

  const [order] = await db
    .insert(orders)
    .values({ ...data, orderNumber, status: 'pending_payment', paymentStatus: 'unpaid' })
    .returning();

  const orderItemsData = items.map((item) => ({
    ...item,
    orderId: order.id,
  }));

  const insertedItems = await db.insert(orderItems).values(orderItemsData).returning();

  // Record initial status
  await db.insert(orderStatusHistory).values({
    orderId: order.id,
    toStatus: 'pending_payment',
    note: 'Order created',
    actorId: data.customerId,
  });

  return { ...order, items: insertedItems };
}

// --- Status Transitions ---

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending_payment: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['packed', 'cancelled'],
  packed: ['dispatched', 'cancelled'],
  dispatched: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered'],
  delivered: [],
  cancelled: [],
};

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  actorId?: string,
  note?: string,
  extra?: { trackingNumber?: string; courierName?: string }
) {
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order) throw new Error('ORDER_NOT_FOUND');

  const allowed = VALID_TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(newStatus)) {
    throw new Error(`INVALID_TRANSITION: ${order.status} -> ${newStatus}`);
  }

  const updateData: Record<string, unknown> = {
    status: newStatus,
    updatedAt: new Date(),
  };

  if (newStatus === 'cancelled') {
    updateData.cancelledAt = new Date();
    updateData.cancellationReason = note;
  }
  if (newStatus === 'delivered') {
    updateData.deliveredAt = new Date();
  }
  if (extra?.trackingNumber) {
    updateData.trackingNumber = extra.trackingNumber;
  }
  if (extra?.courierName) {
    updateData.courierName = extra.courierName;
  }

  const [updated] = await db
    .update(orders)
    .set(updateData)
    .where(eq(orders.id, orderId))
    .returning();

  await db.insert(orderStatusHistory).values({
    orderId,
    fromStatus: order.status,
    toStatus: newStatus,
    note,
    actorId,
  });

  // Send customer notifications for status changes
  const notifyMap: Partial<Record<OrderStatus, 'order.confirmed' | 'order.processing' | 'order.dispatched' | 'order.delivered' | 'order.cancelled'>> = {
    confirmed: 'order.confirmed',
    processing: 'order.processing',
    dispatched: 'order.dispatched',
    delivered: 'order.delivered',
    cancelled: 'order.cancelled',
  };
  const notificationType = notifyMap[newStatus];
  if (notificationType) {
    const fullOrder = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: { customer: true },
    });
    if (fullOrder?.customer?.email) {
      const customerName = [fullOrder.customer.firstName, fullOrder.customer.lastName].filter(Boolean).join(' ') || fullOrder.customer.email;
      notificationService.send(notificationType, {
        customer: { email: fullOrder.customer.email, phone: fullOrder.customer.phone, name: customerName },
        order: { orderNumber: fullOrder.orderNumber, total: Number(fullOrder.totalAmount) },
        extra: extra?.trackingNumber ? { trackingNumber: extra.trackingNumber, courierName: extra.courierName ?? '' } : undefined,
      }).catch((err) => console.error(`[notification] ${newStatus} failed:`, err));
    }
  }

  return updated;
}

// --- Payment Confirmation ---

export async function confirmPayment(
  orderId: string,
  paymentMethod: string,
  providerRef: string,
  confirmedBy: string,
  notes?: string
) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { customer: true },
  });
  if (!order) throw new Error('ORDER_NOT_FOUND');
  if (order.status !== 'pending_payment') throw new Error('ORDER_NOT_PENDING_PAYMENT');

  // Create payment record
  const [payment] = await db.insert(payments).values({
    orderId,
    customerId: order.customerId,
    amount: order.totalAmount,
    currency: order.currency,
    status: 'success',
    paymentMethod,
    providerRef,
    confirmedBy,
    confirmedAt: new Date(),
    notes,
  }).returning();

  // Update order status
  await db
    .update(orders)
    .set({
      paymentStatus: 'paid',
      paymentMethod,
      status: 'confirmed',
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId));

  // Record status change
  await db.insert(orderStatusHistory).values({
    orderId,
    fromStatus: 'pending_payment',
    toStatus: 'confirmed',
    note: `Payment confirmed via ${paymentMethod}. Ref: ${providerRef}`,
    actorId: confirmedBy,
  });

  // Send notifications
  if (order.customer?.email) {
    const customerName = [order.customer.firstName, order.customer.lastName].filter(Boolean).join(' ') || order.customer.email;
    notificationService.send('order.confirmed', {
      customer: { email: order.customer.email, phone: order.customer.phone, name: customerName },
      order: { orderNumber: order.orderNumber, total: Number(order.totalAmount), paymentMethod },
    }).catch((err) => console.error('[notification] order.confirmed failed:', err));
  }

  return payment;
}

// --- Tracking ---

export async function getOrderTracking(orderId: string) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: {
      statusHistory: { orderBy: [desc(orderStatusHistory.createdAt)] },
      deliveryAddress: true,
    },
  });

  if (!order) return null;

  const trackingUrl = getTrackingUrl(order.courierName, order.trackingNumber);

  return {
    orderNumber: order.orderNumber,
    status: order.status,
    trackingNumber: order.trackingNumber,
    courierName: order.courierName,
    trackingUrl,
    estimatedDelivery: order.estimatedDelivery,
    deliveredAt: order.deliveredAt,
    deliveryAddress: order.deliveryAddress,
    timeline: order.statusHistory,
  };
}
