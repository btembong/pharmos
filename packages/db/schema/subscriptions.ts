import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  integer,
  decimal,
  text,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { customers } from './customers';
import { products } from './products';

// Subscription plans (auto-refill)
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id')
      .references(() => customers.id)
      .notNull(),
    productId: uuid('product_id')
      .references(() => products.id)
      .notNull(),
    quantity: integer('quantity').default(1).notNull(),
    frequencyDays: integer('frequency_days').notNull(), // 30, 60, 90
    status: varchar('status', { length: 20 }).default('active').notNull(), // active, paused, cancelled
    nextOrderDate: timestamp('next_order_date', { withTimezone: true }).notNull(),
    lastOrderDate: timestamp('last_order_date', { withTimezone: true }),
    totalOrders: integer('total_orders').default(0).notNull(),
    discountPercent: decimal('discount_percent', { precision: 5, scale: 2 }).default('0'),
    deliveryAddressId: uuid('delivery_address_id'),
    pausedUntil: timestamp('paused_until', { withTimezone: true }),
    cancellationReason: text('cancellation_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_subscriptions_customer').on(table.customerId),
    index('idx_subscriptions_next_order').on(table.nextOrderDate),
    index('idx_subscriptions_status').on(table.status),
  ]
);

// Subscription order history
export const subscriptionOrders = pgTable(
  'subscription_orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    subscriptionId: uuid('subscription_id')
      .references(() => subscriptions.id)
      .notNull(),
    orderId: uuid('order_id'),
    status: varchar('status', { length: 20 }).default('pending').notNull(), // pending, created, failed, skipped
    scheduledDate: timestamp('scheduled_date', { withTimezone: true }).notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    failureReason: text('failure_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_sub_orders_subscription').on(table.subscriptionId),
  ]
);

// Relations
export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  customer: one(customers, {
    fields: [subscriptions.customerId],
    references: [customers.id],
  }),
  product: one(products, {
    fields: [subscriptions.productId],
    references: [products.id],
  }),
  orders: many(subscriptionOrders),
}));

export const subscriptionOrdersRelations = relations(subscriptionOrders, ({ one }) => ({
  subscription: one(subscriptions, {
    fields: [subscriptionOrders.subscriptionId],
    references: [subscriptions.id],
  }),
}));

// Inferred types
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type SubscriptionOrder = typeof subscriptionOrders.$inferSelect;
export type NewSubscriptionOrder = typeof subscriptionOrders.$inferInsert;
