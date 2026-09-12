import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const blogPosts = pgTable(
  'blog_posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 200 }).notNull().unique(),
    title: varchar('title', { length: 200 }).notNull(),
    excerpt: text('excerpt'),
    body: text('body'), // Markdown
    featuredImage: text('featured_image'),
    author: varchar('author', { length: 100 }),
    authorTitle: varchar('author_title', { length: 100 }), // e.g. "PharmD, Licensed Pharmacist"
    category: varchar('category', { length: 50 }), // 'drug-guides' | 'wellness' | 'news' | etc.
    tags: text('tags').array(),
    status: varchar('status', { length: 20 }).default('draft').notNull(), // draft | published
    publishedAt: timestamp('published_at', { withTimezone: true }),
    metaTitle: varchar('meta_title', { length: 60 }),
    metaDescription: varchar('meta_description', { length: 160 }),
    featuredImageAlt: varchar('featured_image_alt', { length: 255 }),
    relatedProductSlugs: text('related_product_slugs').array(),
    readingTimeMinutes: varchar('reading_time_minutes', { length: 5 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_blog_slug').on(table.slug),
    index('idx_blog_status').on(table.status),
    index('idx_blog_category').on(table.category),
    index('idx_blog_published_at').on(table.publishedAt),
  ]
);

export const blogPostsRelations = relations(blogPosts, ({ many: _many }) => ({}));

// Newsletter subscribers
export const newsletterSubscribers = pgTable(
  'newsletter_subscribers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    source: varchar('source', { length: 50 }), // 'footer' | 'popup' | 'checkout' | 'blog'
    status: varchar('status', { length: 20 }).default('active').notNull(), // active | unsubscribed
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    unsubscribedAt: timestamp('unsubscribed_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_newsletter_email').on(table.email),
    index('idx_newsletter_status').on(table.status),
  ]
);

// Inferred types
export type BlogPost = typeof blogPosts.$inferSelect;
export type NewBlogPost = typeof blogPosts.$inferInsert;
export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
export type NewNewsletterSubscriber = typeof newsletterSubscribers.$inferInsert;
