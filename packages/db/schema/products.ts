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
  index,
  real,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { customers } from './customers';

// Product categories
export const productCategories = pgTable('product_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  parentId: uuid('parent_id').references((): any => productCategories.id),
  description: text('description'),
  imageUrl: text('image_url'),
  heroImageUrl: text('hero_image_url'),
  megaMenuImageUrl: text('mega_menu_image_url'),
  iconName: varchar('icon_name', { length: 50 }).default('ShieldCheck'),
  color: varchar('color', { length: 30 }).default('text-purple-600'),
  bgColor: varchar('bg_color', { length: 50 }).default('bg-[#7371FC]'),
  heroHeadline: varchar('hero_headline', { length: 255 }),
  heroSubtext: text('hero_subtext'),
  heroBg: varchar('hero_bg', { length: 50 }).default('bg-[#010128]'),
  heroAccent: varchar('hero_accent', { length: 50 }).default('text-[#A594F9]'),
  badgeBg: varchar('badge_bg', { length: 50 }).default('bg-[#7371FC]'),
  benefits: jsonb('benefits').$type<{ icon: string; title: string; desc: string }[]>(),
  faqs: jsonb('faqs').$type<{ q: string; a: string }[]>(),
  disclaimer: text('disclaimer'),
  trustText: text('trust_text'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// Master product catalog
export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).unique().notNull(),
    genericName: varchar('generic_name', { length: 255 }),
    brandName: varchar('brand_name', { length: 255 }),
    categoryId: uuid('category_id').references(() => productCategories.id),
    description: text('description'),
    shortDescription: varchar('short_description', { length: 500 }),
    activeIngredients: jsonb('active_ingredients').$type<
      { name: string; strength: string; unit: string }[]
    >(),
    dosageForm: varchar('dosage_form', { length: 100 }),
    strength: varchar('strength', { length: 100 }),
    packSize: varchar('pack_size', { length: 100 }),
    manufacturer: varchar('manufacturer', { length: 255 }),
    countryOfOrigin: varchar('country_of_origin', { length: 100 }),
    ndcNumber: varchar('ndc_number', { length: 20 }),
    requiresPrescription: boolean('requires_prescription').default(false).notNull(),
    isControlledSubstance: boolean('is_controlled_substance').default(false).notNull(),
    controlledClass: varchar('controlled_class', { length: 50 }),
    storageConditions: varchar('storage_conditions', { length: 255 }),
    requiresColdChain: boolean('requires_cold_chain').default(false).notNull(),
    images: jsonb('images').$type<{ url: string; alt: string; isPrimary: boolean }[]>(),
    tags: text('tags').array(),
    isActive: boolean('is_active').default(true).notNull(),
    isFeatured: boolean('is_featured').default(false).notNull(),
    metaTitle: varchar('meta_title', { length: 255 }),
    metaDescription: varchar('meta_description', { length: 500 }),
    // Peptide / research compound fields
    isResearchCompound: boolean('is_research_compound').default(false).notNull(),
    purityPercent: real('purity_percent'),
    molecularWeight: varchar('molecular_weight', { length: 50 }),
    aminoAcidSequence: text('amino_acid_sequence'),
    casNumber: varchar('cas_number', { length: 50 }),
    coaUrl: text('coa_url'),
    vialSizeMg: varchar('vial_size_mg', { length: 50 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_products_category').on(table.categoryId),
    index('idx_products_slug').on(table.slug),
    index('idx_products_active').on(table.isActive),
  ]
);

// Product pricing (B2C only for now)
export const productPrices = pgTable(
  'product_prices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .references(() => products.id)
      .notNull(),
    priceType: varchar('price_type', { length: 20 }).default('b2c').notNull(),
    currency: varchar('currency', { length: 3 }).default('USD').notNull(),
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
    compareAtPrice: decimal('compare_at_price', { precision: 12, scale: 2 }),
    validFrom: timestamp('valid_from', { withTimezone: true }).defaultNow(),
    validUntil: timestamp('valid_until', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_prices_product').on(table.productId)]
);

// Drug interactions reference data
export const drugInteractions = pgTable(
  'drug_interactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    drugA: varchar('drug_a', { length: 255 }).notNull(),
    drugB: varchar('drug_b', { length: 255 }).notNull(),
    severity: varchar('severity', { length: 20 }).notNull(),
    description: text('description').notNull(),
    recommendation: text('recommendation'),
    source: varchar('source', { length: 100 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_interactions_drug_a').on(table.drugA),
    index('idx_interactions_drug_b').on(table.drugB),
  ]
);

// Relations
export const productCategoriesRelations = relations(productCategories, ({ one, many }) => ({
  parent: one(productCategories, {
    fields: [productCategories.parentId],
    references: [productCategories.id],
    relationName: 'categoryParent',
  }),
  children: many(productCategories, { relationName: 'categoryParent' }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(productCategories, {
    fields: [products.categoryId],
    references: [productCategories.id],
  }),
  prices: many(productPrices),
  reviews: many(productReviews),
}));

export const productPricesRelations = relations(productPrices, ({ one }) => ({
  product: one(products, {
    fields: [productPrices.productId],
    references: [products.id],
  }),
}));

// Product reviews
export const productReviews = pgTable(
  'product_reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id').references(() => products.id).notNull(),
    customerId: uuid('customer_id').references(() => customers.id),
    reviewerName: varchar('reviewer_name', { length: 100 }).notNull(),
    rating: integer('rating').notNull(), // 1-5
    title: varchar('title', { length: 255 }),
    body: text('body'),
    images: jsonb('images').$type<{ url: string; alt: string }[]>(),
    isVerifiedPurchase: boolean('is_verified_purchase').default(false),
    isApproved: boolean('is_approved').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_reviews_product').on(table.productId),
    index('idx_reviews_customer').on(table.customerId),
  ]
);

export const productReviewsRelations = relations(productReviews, ({ one }) => ({
  product: one(products, {
    fields: [productReviews.productId],
    references: [products.id],
  }),
  customer: one(customers, {
    fields: [productReviews.customerId],
    references: [customers.id],
  }),
}));

// Manual product pairings for "Frequently Bought Together"
export const productPairings = pgTable(
  'product_pairings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id').references(() => products.id).notNull(),
    pairedProductId: uuid('paired_product_id').references(() => products.id).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_pairings_product').on(table.productId),
  ]
);

export const productPairingsRelations = relations(productPairings, ({ one }) => ({
  product: one(products, {
    fields: [productPairings.productId],
    references: [products.id],
  }),
  pairedProduct: one(products, {
    fields: [productPairings.pairedProductId],
    references: [products.id],
  }),
}));

// Inferred types
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductCategory = typeof productCategories.$inferSelect;
export type NewProductCategory = typeof productCategories.$inferInsert;
export type ProductPrice = typeof productPrices.$inferSelect;
export type NewProductPrice = typeof productPrices.$inferInsert;
export type DrugInteraction = typeof drugInteractions.$inferSelect;
export type NewDrugInteraction = typeof drugInteractions.$inferInsert;
export type ProductReview = typeof productReviews.$inferSelect;
export type NewProductReview = typeof productReviews.$inferInsert;
export type ProductPairing = typeof productPairings.$inferSelect;
export type NewProductPairing = typeof productPairings.$inferInsert;
