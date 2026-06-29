import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  text,
  jsonb,
  integer,
  decimal,
  date,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { products } from './products';

// Inventory batches (batch-level stock tracking)
export const inventoryBatches = pgTable(
  'inventory_batches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .references(() => products.id)
      .notNull(),
    batchNumber: varchar('batch_number', { length: 100 }).notNull(),
    expiryDate: date('expiry_date').notNull(),
    manufactureDate: date('manufacture_date'),
    quantityReceived: integer('quantity_received').notNull(),
    quantityOnHand: integer('quantity_on_hand').notNull().default(0),
    quantityReserved: integer('quantity_reserved').notNull().default(0),
    costPrice: decimal('cost_price', { precision: 12, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).default('USD').notNull(),
    location: varchar('location', { length: 100 }),
    isQuarantined: boolean('is_quarantined').default(false).notNull(),
    quarantineReason: text('quarantine_reason'),
    receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    unique('uq_product_batch').on(table.productId, table.batchNumber),
    index('idx_batches_product').on(table.productId),
    index('idx_batches_expiry').on(table.expiryDate),
  ]
);

// Stock movements (every movement logged)
export const stockMovements = pgTable(
  'stock_movements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .references(() => products.id)
      .notNull(),
    batchId: uuid('batch_id')
      .references(() => inventoryBatches.id)
      .notNull(),
    movementType: varchar('movement_type', { length: 50 }).notNull(),
    quantity: integer('quantity').notNull(),
    referenceType: varchar('reference_type', { length: 50 }),
    referenceId: uuid('reference_id'),
    reason: text('reason'),
    actorId: varchar('actor_id', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_movements_product').on(table.productId),
    index('idx_movements_batch').on(table.batchId),
  ]
);

// Stock reservations (cart and order holds)
export const stockReservations = pgTable(
  'stock_reservations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .references(() => products.id)
      .notNull(),
    batchId: uuid('batch_id')
      .references(() => inventoryBatches.id)
      .notNull(),
    quantity: integer('quantity').notNull(),
    reservationType: varchar('reservation_type', { length: 20 }).default('soft').notNull(),
    referenceType: varchar('reference_type', { length: 50 }),
    referenceId: uuid('reference_id').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    releasedAt: timestamp('released_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_reservations_reference').on(table.referenceId),
    index('idx_reservations_expires').on(table.expiresAt),
  ]
);

// Reorder rules
export const reorderRules = pgTable('reorder_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id')
    .references(() => products.id)
    .unique()
    .notNull(),
  reorderPoint: integer('reorder_point').notNull(),
  reorderQuantity: integer('reorder_quantity').notNull(),
  isAutoReorder: boolean('is_auto_reorder').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Relations
export const inventoryBatchesRelations = relations(inventoryBatches, ({ one, many }) => ({
  product: one(products, {
    fields: [inventoryBatches.productId],
    references: [products.id],
  }),
  movements: many(stockMovements),
  reservations: many(stockReservations),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  product: one(products, {
    fields: [stockMovements.productId],
    references: [products.id],
  }),
  batch: one(inventoryBatches, {
    fields: [stockMovements.batchId],
    references: [inventoryBatches.id],
  }),
}));

export const stockReservationsRelations = relations(stockReservations, ({ one }) => ({
  product: one(products, {
    fields: [stockReservations.productId],
    references: [products.id],
  }),
  batch: one(inventoryBatches, {
    fields: [stockReservations.batchId],
    references: [inventoryBatches.id],
  }),
}));

// Inferred types
export type InventoryBatch = typeof inventoryBatches.$inferSelect;
export type NewInventoryBatch = typeof inventoryBatches.$inferInsert;
export type StockMovement = typeof stockMovements.$inferSelect;
export type NewStockMovement = typeof stockMovements.$inferInsert;
export type StockReservation = typeof stockReservations.$inferSelect;
export type NewStockReservation = typeof stockReservations.$inferInsert;
export type ReorderRule = typeof reorderRules.$inferSelect;
export type NewReorderRule = typeof reorderRules.$inferInsert;
