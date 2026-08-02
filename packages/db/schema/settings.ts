import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  timestamp,
  index,
  unique,
} from 'drizzle-orm/pg-core';

// US state tax rates by product type
export const taxRates = pgTable(
  'tax_rates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    state: varchar('state', { length: 2 }).notNull(),
    productType: varchar('product_type', { length: 30 }).notNull(), // otc, supplement, device, general
    rate: decimal('rate', { precision: 6, scale: 4 }).notNull(), // e.g. 0.0725 = 7.25%
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('uq_tax_state_type').on(table.state, table.productType),
    index('idx_tax_state').on(table.state),
  ]
);

// Inferred types
export type TaxRate = typeof taxRates.$inferSelect;
export type NewTaxRate = typeof taxRates.$inferInsert;

// Generic key-value site settings (whatsapp, promo, contact, about, etc.)
export const siteSettings = pgTable(
  'site_settings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    key: varchar('key', { length: 100 }).notNull().unique(),
    value: text('value'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_site_settings_key').on(table.key),
  ]
);

export type SiteSetting = typeof siteSettings.$inferSelect;
export type NewSiteSetting = typeof siteSettings.$inferInsert;
