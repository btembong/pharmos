import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  text,
  decimal,
  integer,
  date,
  unique,
} from 'drizzle-orm/pg-core';

// Delivery zones (US-based: state/ZIP groupings)
export const deliveryZones = pgTable('delivery_zones', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(), // local, regional, national
  states: text('states').array(),
  zipRanges: text('zip_ranges').array(), // e.g. ['90000-90999', '91000-91999']
  standardDaysMin: integer('standard_days_min').notNull(),
  standardDaysMax: integer('standard_days_max').notNull(),
  expressDays: integer('express_days'),
  standardFee: decimal('standard_fee', { precision: 10, scale: 2 }).default('0').notNull(),
  expressFee: decimal('express_fee', { precision: 10, scale: 2 }),
  freeDeliveryAbove: decimal('free_delivery_above', { precision: 12, scale: 2 }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Order cutoff rules
export const cutoffRules = pgTable('cutoff_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }),
  cutoffHour: integer('cutoff_hour').notNull(), // 14 = 2pm
  cutoffTimezone: varchar('cutoff_timezone', { length: 50 }).default('America/New_York').notNull(),
  processingDays: integer('processing_days').default(1).notNull(),
  excludesWeekends: boolean('excludes_weekends').default(true).notNull(),
  excludesHolidays: boolean('excludes_holidays').default(true).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// US public holidays
export const publicHolidays = pgTable(
  'public_holidays',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    country: varchar('country', { length: 3 }).default('US').notNull(),
    date: date('date').notNull(),
    name: varchar('name', { length: 100 }),
  },
  (table) => [unique('uq_holiday_date').on(table.country, table.date)]
);

// Inferred types
export type DeliveryZone = typeof deliveryZones.$inferSelect;
export type NewDeliveryZone = typeof deliveryZones.$inferInsert;
export type CutoffRule = typeof cutoffRules.$inferSelect;
export type NewCutoffRule = typeof cutoffRules.$inferInsert;
export type PublicHoliday = typeof publicHolidays.$inferSelect;
export type NewPublicHoliday = typeof publicHolidays.$inferInsert;
