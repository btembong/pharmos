import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
} from 'drizzle-orm/pg-core';

export const banners = pgTable('banners', {
  id: uuid('id').primaryKey().defaultRandom(),
  placement: varchar('placement', { length: 50 }).notNull().default('homepage_hero'),
  title: varchar('title', { length: 255 }).notNull(),
  highlight: varchar('highlight', { length: 255 }),
  description: text('description'),
  badgeText: varchar('badge_text', { length: 100 }),
  ctaLabel: varchar('cta_label', { length: 100 }),
  ctaUrl: varchar('cta_url', { length: 500 }),
  imageUrl: text('image_url'),
  overlayOpacity: integer('overlay_opacity').default(60).notNull(), // 0-100, controls dark overlay for text readability
  textColor: varchar('text_color', { length: 10 }).default('light').notNull(), // 'light' or 'dark'
  sortOrder: integer('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type Banner = typeof banners.$inferSelect;
export type NewBanner = typeof banners.$inferInsert;
