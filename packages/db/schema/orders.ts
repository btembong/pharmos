import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  text,
  decimal,
  integer,
  date,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { products } from './products';
import { customers, customerAddresses } from './customers';
import { inventoryBatches } from './inventory';

// Orders (B2C only for now)
export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderNumber: varchar('order_number', { length: 50 }).unique().notNull(),
    customerId: uuid('customer_id')
      .references(() => customers.id)
      .notNull(),
    status: varchar('status', { length: 30 }).default('pending_payment').notNull(),
    // Delivery
    deliveryMethod: varchar('delivery_method', { length: 30 }),
    deliveryAddressId: uuid('delivery_address_id').references(() => customerAddresses.id),
    estimatedDelivery: date('estimated_delivery'),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    deliveryNotes: text('delivery_notes'),
    trackingNumber: varchar('tracking_number', { length: 100 }),
    courierName: varchar('courier_name', { length: 100 }),
    // Pricing
    currency: varchar('currency', { length: 3 }).default('USD').notNull(),
    subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
    deliveryFee: decimal('delivery_fee', { precision: 12, scale: 2 }).default('0'),
    discountAmount: decimal('discount_amount', { precision: 12, scale: 2 }).default('0'),
    taxAmount: decimal('tax_amount', { precision: 12, scale: 2 }).default('0'),
    totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
    // Payment
    paymentStatus: varchar('payment_status', { length: 20 }).default('unpaid').notNull(),
    paymentMethod: varchar('payment_method', { length: 50 }),
    // Meta
    notes: text('notes'),
    internalNotes: text('internal_notes'),
    processedBy: varchar('processed_by', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    paymentClaimedAt: timestamp('payment_claimed_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancellationReason: text('cancellation_reason'),
  },
  (table) => [
    index('idx_orders_customer').on(table.customerId),
    index('idx_orders_status').on(table.status),
    index('idx_orders_number').on(table.orderNumber),
    index('idx_orders_created').on(table.createdAt),
  ]
);

// Order line items
export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .references(() => orders.id)
      .notNull(),
    productId: uuid('product_id')
      .references(() => products.id)
      .notNull(),
    batchId: uuid('batch_id').references(() => inventoryBatches.id),
    productName: varchar('product_name', { length: 255 }).notNull(),
    productSlug: varchar('product_slug', { length: 255 }),
    quantity: integer('quantity').notNull(),
    unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
    costPrice: decimal('cost_price', { precision: 12, scale: 2 }),
    discount: decimal('discount', { precision: 12, scale: 2 }).default('0'),
    totalPrice: decimal('total_price', { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_order_items_order').on(table.orderId)]
);

// Order status history
export const orderStatusHistory = pgTable(
  'order_status_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .references(() => orders.id)
      .notNull(),
    fromStatus: varchar('from_status', { length: 30 }),
    toStatus: varchar('to_status', { length: 30 }).notNull(),
    note: text('note'),
    actorId: varchar('actor_id', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_status_history_order').on(table.orderId)]
);

// Relations
export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  deliveryAddress: one(customerAddresses, {
    fields: [orders.deliveryAddressId],
    references: [customerAddresses.id],
  }),
  items: many(orderItems),
  statusHistory: many(orderStatusHistory),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  batch: one(inventoryBatches, {
    fields: [orderItems.batchId],
    references: [inventoryBatches.id],
  }),
}));

export const orderStatusHistoryRelations = relations(orderStatusHistory, ({ one }) => ({
  order: one(orders, {
    fields: [orderStatusHistory.orderId],
    references: [orders.id],
  }),
}));

// Inferred types
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
export type OrderStatusHistory = typeof orderStatusHistory.$inferSelect;
export type NewOrderStatusHistory = typeof orderStatusHistory.$inferInsert;
