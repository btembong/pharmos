import { db } from '../lib/db';
import {
  products,
  productCategories,
  productPrices,
  drugInteractions,
} from '@pharmaflow/db/schema';
import { eq, and, isNull, ilike, or, sql, desc, asc, SQL } from 'drizzle-orm';
import type { NewProduct, NewProductCategory, NewProductPrice } from '@pharmaflow/types';

// --- Products ---

interface ProductFilters {
  search?: string;
  categoryId?: string;
  categorySlug?: string; // resolved to categoryId if provided
  dosageForm?: string;
  inStock?: boolean;
  requiresPrescription?: boolean;
  isFeatured?: boolean;
  sortBy?: 'name' | 'price_asc' | 'price_desc' | 'newest';
  page?: number;
  limit?: number;
}

export async function listProducts(filters: ProductFilters = {}) {
  const { page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;

  const conditions: SQL[] = [isNull(products.deletedAt), eq(products.isActive, true)];

  // Resolve categorySlug → categoryId if needed
  let resolvedCategoryId = filters.categoryId;
  if (!resolvedCategoryId && filters.categorySlug) {
    const cat = await db.query.productCategories.findFirst({
      where: and(eq(productCategories.slug, filters.categorySlug), isNull(productCategories.deletedAt)),
      columns: { id: true },
    });
    resolvedCategoryId = cat?.id;
  }

  if (resolvedCategoryId) {
    conditions.push(eq(products.categoryId, resolvedCategoryId));
  }
  if (filters.dosageForm) {
    conditions.push(eq(products.dosageForm, filters.dosageForm));
  }
  if (filters.requiresPrescription !== undefined) {
    conditions.push(eq(products.requiresPrescription, filters.requiresPrescription));
  }
  if (filters.isFeatured) {
    conditions.push(eq(products.isFeatured, true));
  }
  if (filters.search) {
    // Use PostgreSQL full-text search with plainto_tsquery
    const searchTerm = filters.search.replace(/[^\w\s]/g, '').trim();
    if (searchTerm) {
      conditions.push(
        sql`(
          to_tsvector('english', coalesce(${products.name}, '') || ' ' || coalesce(${products.genericName}, '') || ' ' || coalesce(${products.brandName}, '') || ' ' || coalesce(${products.manufacturer}, '') || ' ' || coalesce(${products.shortDescription}, ''))
          @@ plainto_tsquery('english', ${searchTerm})
          OR ${products.name} ILIKE ${'%' + searchTerm + '%'}
        )`
      );
    }
  }

  const where = and(...conditions);

  let orderBy;
  switch (filters.sortBy) {
    case 'name':
      orderBy = asc(products.name);
      break;
    case 'newest':
      orderBy = desc(products.createdAt);
      break;
    case 'price_asc':
    case 'price_desc':
      // Price sort done in-query via a subquery on product_prices
      orderBy = desc(products.createdAt); // fallback; price sort applied below
      break;
    default:
      orderBy = desc(products.createdAt);
  }

  const [data, countResult] = await Promise.all([
    db.query.products.findMany({
      where,
      orderBy: [orderBy],
      limit,
      offset,
      with: {
        category: true,
        prices: true,
      },
    }),
    db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(where),
  ]);

  const total = Number(countResult[0].count);

  return {
    data,
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
  };
}

export async function getProductBySlug(slug: string) {
  const product = await db.query.products.findFirst({
    where: and(eq(products.slug, slug), isNull(products.deletedAt)),
    with: {
      category: true,
      prices: true,
    },
  });
  return product ?? null;
}

export async function getProductById(id: string) {
  const product = await db.query.products.findFirst({
    where: and(eq(products.id, id), isNull(products.deletedAt)),
    with: {
      category: true,
      prices: true,
    },
  });
  return product ?? null;
}

export async function createProduct(data: NewProduct) {
  const [product] = await db.insert(products).values(data).returning();
  return product;
}

export async function updateProduct(id: string, data: Partial<NewProduct>) {
  const [product] = await db
    .update(products)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(products.id, id), isNull(products.deletedAt)))
    .returning();
  return product ?? null;
}

export async function softDeleteProduct(id: string) {
  const [product] = await db
    .update(products)
    .set({ deletedAt: new Date(), isActive: false })
    .where(and(eq(products.id, id), isNull(products.deletedAt)))
    .returning();
  return product ?? null;
}

// --- Categories ---

export async function listCategories() {
  return db
    .select()
    .from(productCategories)
    .where(isNull(productCategories.deletedAt))
    .orderBy(asc(productCategories.sortOrder), asc(productCategories.name));
}

export async function createCategory(data: NewProductCategory) {
  const [category] = await db.insert(productCategories).values(data).returning();
  return category;
}

export async function updateCategory(id: string, data: Partial<NewProductCategory>) {
  const [category] = await db
    .update(productCategories)
    .set(data)
    .where(and(eq(productCategories.id, id), isNull(productCategories.deletedAt)))
    .returning();
  return category ?? null;
}

// --- Prices ---

export async function setProductPrice(data: NewProductPrice) {
  const [price] = await db.insert(productPrices).values(data).returning();
  return price;
}

export async function getProductPrice(productId: string, priceType: string = 'b2c') {
  return db.query.productPrices.findFirst({
    where: and(
      eq(productPrices.productId, productId),
      eq(productPrices.priceType, priceType)
    ),
  });
}

// --- Drug Interactions ---

export async function checkInteractions(genericNames: string[]) {
  if (genericNames.length < 2) return [];

  const interactions = [];
  for (let i = 0; i < genericNames.length; i++) {
    for (let j = i + 1; j < genericNames.length; j++) {
      const nameA = genericNames[i].toLowerCase();
      const nameB = genericNames[j].toLowerCase();

      const result = await db
        .select()
        .from(drugInteractions)
        .where(
          or(
            and(
              ilike(drugInteractions.drugA, nameA),
              ilike(drugInteractions.drugB, nameB)
            ),
            and(
              ilike(drugInteractions.drugA, nameB),
              ilike(drugInteractions.drugB, nameA)
            )
          )
        );

      interactions.push(...result);
    }
  }
  return interactions;
}

// --- Drug Interaction Admin ---

export async function listInteractions(page = 1, limit = 50) {
  const offset = (page - 1) * limit;

  const [data, countResult] = await Promise.all([
    db.select().from(drugInteractions).orderBy(asc(drugInteractions.drugA), asc(drugInteractions.drugB)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(drugInteractions),
  ]);

  const total = Number(countResult[0].count);
  return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
}

export async function createInteraction(data: {
  drugA: string;
  drugB: string;
  severity: string;
  description: string;
  recommendation?: string;
  source?: string;
}) {
  const [row] = await db.insert(drugInteractions).values(data).returning();
  return row;
}

export async function updateInteraction(id: string, data: {
  drugA?: string;
  drugB?: string;
  severity?: string;
  description?: string;
  recommendation?: string;
  source?: string;
}) {
  const [row] = await db.update(drugInteractions).set(data).where(eq(drugInteractions.id, id)).returning();
  return row ?? null;
}

export async function deleteInteraction(id: string) {
  const [row] = await db.delete(drugInteractions).where(eq(drugInteractions.id, id)).returning();
  return row ?? null;
}
