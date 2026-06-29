import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  text,
  decimal,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { orders } from './orders';
import { customers } from './customers';

// Payments (manual confirmation)
export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .references(() => orders.id)
      .notNull(),
    customerId: uuid('customer_id')
      .references(() => customers.id)
      .notNull(),
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).default('USD').notNull(),
    status: varchar('status', { length: 20 }).default('pending').notNull(),
    paymentMethod: varchar('payment_method', { length: 50 }).notNull(),
    providerRef: varchar('provider_ref', { length: 255 }),
    proofUrl: text('proof_url'),
    failureReason: text('failure_reason'),
    confirmedBy: varchar('confirmed_by', { length: 255 }),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_payments_order').on(table.orderId),
    index('idx_payments_customer').on(table.customerId),
    index('idx_payments_status').on(table.status),
  ]
);

// Admin-configurable payment methods (Zelle, Venmo, CashApp, wire, etc.)
export const paymentMethods = pgTable('payment_methods', {
  id: uuid('id').primaryKey().defaultRandom(),
  method: varchar('method', { length: 50 }).unique().notNull(),
  label: varchar('label', { length: 100 }).notNull(),
  details: text('details').notNull(),
  instructions: text('instructions'),
  icon: varchar('icon', { length: 50 }),
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Relations
export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, {
    fields: [payments.orderId],
    references: [orders.id],
  }),
  customer: one(customers, {
    fields: [payments.customerId],
    references: [customers.id],
  }),
}));

// Inferred types
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type NewPaymentMethod = typeof paymentMethods.$inferInsert;
