import { Router, type Request } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate, validateQuery } from '../middleware/validate';
import { writeAuditLog } from '../lib/audit';
import { getAuth } from '@clerk/express';
import * as productService from '../services/product.service';
import { db } from '../lib/db';
import { productReviews, orderItems, orders, productPairings, products } from '@pharmaflow/db/schema';
import { eq, and, isNull, desc, sql, avg, count, asc, gte } from 'drizzle-orm';

const router: Router = Router();

function param(req: Request, name: string): string {
  return req.params[name] as string;
}

// --- Query schemas ---

const listQuerySchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  categorySlug: z.string().optional(), // alternative to categoryId — resolved server-side
  dosageForm: z.string().optional(),
  requiresPrescription: z.coerce.boolean().optional(),
  isFeatured: z.coerce.boolean().optional(),
  sortBy: z.enum(['name', 'price_asc', 'price_desc', 'newest']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// --- Body schemas ---

const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  genericName: z.string().max(255).optional(),
  brandName: z.string().max(255).optional(),
  categoryId: z.string().uuid().optional(),
  description: z.string().optional(),
  shortDescription: z.string().max(500).optional(),
  activeIngredients: z
    .array(z.object({ name: z.string(), strength: z.string(), unit: z.string() }))
    .optional(),
  dosageForm: z.string().max(100).optional(),
  strength: z.string().max(100).optional(),
  packSize: z.string().max(100).optional(),
  manufacturer: z.string().max(255).optional(),
  countryOfOrigin: z.string().max(100).optional(),
  ndcNumber: z.string().max(20).optional(),
  requiresPrescription: z.boolean().default(false),
  isControlledSubstance: z.boolean().default(false),
  controlledClass: z.string().max(50).optional(),
  storageConditions: z.string().max(255).optional(),
  requiresColdChain: z.boolean().default(false),
  images: z
    .array(z.object({ url: z.string(), alt: z.string(), isPrimary: z.boolean() }))
    .optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  metaTitle: z.string().max(255).optional(),
  metaDescription: z.string().max(500).optional(),
});

const updateProductSchema = createProductSchema.partial();

const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
  parentId: z.string().uuid().nullable().optional(),
  description: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  heroImageUrl: z.string().nullable().optional(),
  megaMenuImageUrl: z.string().nullable().optional(),
  iconName: z.string().max(50).nullable().optional(),
  color: z.string().max(30).nullable().optional(),
  bgColor: z.string().max(50).nullable().optional(),
  heroHeadline: z.string().max(255).nullable().optional(),
  heroSubtext: z.string().nullable().optional(),
  heroBg: z.string().max(50).nullable().optional(),
  heroAccent: z.string().max(50).nullable().optional(),
  badgeBg: z.string().max(50).nullable().optional(),
  benefits: z.array(z.object({ icon: z.string(), title: z.string(), desc: z.string() })).nullable().optional(),
  faqs: z.array(z.object({ q: z.string(), a: z.string() })).nullable().optional(),
  disclaimer: z.string().nullable().optional(),
  trustText: z.string().nullable().optional(),
  sortOrder: z.number().int().default(0),
});

const updateCategorySchema = createCategorySchema.partial();

const setPriceSchema = z.object({
  productId: z.string().uuid(),
  priceType: z.string().default('b2c'),
  currency: z.string().default('USD'),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  compareAtPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
});

const interactionCheckSchema = z.object({
  genericNames: z.array(z.string()).min(2),
});

// --- Public routes ---

// GET /api/products — list products (public)
router.get('/', validateQuery(listQuerySchema), async (req, res) => {
  try {
    const result = await productService.listProducts(req.query as any);
    res.json(result);
  } catch (error) {
    console.error('Error listing products:', (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/products/categories — list categories (public)
router.get('/categories', async (_req, res) => {
  try {
    const categories = await productService.listCategories();
    res.json({ data: categories });
  } catch (error) {
    console.error('Error listing categories:', (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/products/best-sellers — top products by order count (public)
router.get('/best-sellers', async (_req, res) => {
  try {
    const bestSellers = await db
      .select({
        productId: orderItems.productId,
        totalSold: sql<number>`sum(${orderItems.quantity})::int`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(
        and(
          sql`${orders.status} NOT IN ('cancelled')`,
          isNull(orders.cancelledAt)
        )
      )
      .groupBy(orderItems.productId)
      .orderBy(sql`sum(${orderItems.quantity}) DESC`)
      .limit(12);

    if (bestSellers.length === 0) {
      const result = await productService.listProducts({ isFeatured: true, limit: 12 });
      res.json(result);
      return;
    }

    const productIds = bestSellers.map((b) => b.productId);
    const result = await productService.listProducts({ limit: 12 });
    const filtered = productIds
      .map((id) => result.data.find((p: any) => p.id === id))
      .filter(Boolean);

    res.json({ data: filtered.length > 0 ? filtered : result.data, meta: { total: filtered.length } });
  } catch (error) {
    console.error('Error getting best sellers:', (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/products/top-reviews — recent 5-star reviews across all products (public)
router.get('/top-reviews', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 6, 20);

    const reviews = await db
      .select({
        id: productReviews.id,
        reviewerName: productReviews.reviewerName,
        rating: productReviews.rating,
        title: productReviews.title,
        body: productReviews.body,
        isVerifiedPurchase: productReviews.isVerifiedPurchase,
        createdAt: productReviews.createdAt,
        productName: products.name,
        productSlug: products.slug,
      })
      .from(productReviews)
      .innerJoin(products, eq(products.id, productReviews.productId))
      .where(
        and(
          eq(productReviews.isApproved, true),
          isNull(productReviews.deletedAt),
          gte(productReviews.rating, 4)
        )
      )
      .orderBy(desc(productReviews.createdAt))
      .limit(limit);

    res.json({ data: reviews });
  } catch (error) {
    console.error('Error fetching top reviews:', (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/products/:slug — get product by slug (public)
router.get('/:slug', async (req, res) => {
  try {
    const product = await productService.getProductBySlug(param(req, 'slug'));
    if (!product) {
      res.status(404).json({ error: 'Product not found', code: 'NOT_FOUND' });
      return;
    }
    res.json({ data: product });
  } catch (error) {
    console.error('Error getting product:', (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/products/interactions — check drug interactions (public)
router.post('/interactions', validate(interactionCheckSchema), async (req, res) => {
  try {
    const interactions = await productService.checkInteractions(req.body.genericNames);
    res.json({ data: interactions });
  } catch (error) {
    console.error('Error checking interactions:', (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Interaction Admin Routes ---

const createInteractionSchema = z.object({
  drugA: z.string().min(1).max(255),
  drugB: z.string().min(1).max(255),
  severity: z.enum(['minor', 'moderate', 'major', 'contraindicated']),
  description: z.string().min(1),
  recommendation: z.string().optional(),
  source: z.string().max(100).optional(),
});

// GET /api/products/interactions/all — admin, list all interactions
router.get(
  '/interactions/all',
  requireAuth,
  requireRole('super_admin', 'pharmacist'),
  async (req, res) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 50;
      const result = await productService.listInteractions(page, limit);
      res.json(result);
    } catch (error) {
      console.error('Error listing interactions:', (error as Error).message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/products/interactions/create — admin, create interaction
router.post(
  '/interactions/create',
  requireAuth,
  requireRole('super_admin', 'pharmacist'),
  validate(createInteractionSchema),
  async (req, res) => {
    try {
      const row = await productService.createInteraction(req.body);
      res.status(201).json({ data: row });
    } catch (error) {
      console.error('Error creating interaction:', (error as Error).message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PUT /api/products/interactions/:id — admin, update interaction
router.put(
  '/interactions/:id',
  requireAuth,
  requireRole('super_admin', 'pharmacist'),
  async (req, res) => {
    try {
      const row = await productService.updateInteraction(req.params.id, req.body);
      if (!row) { res.status(404).json({ error: 'Not found' }); return; }
      res.json({ data: row });
    } catch (error) {
      console.error('Error updating interaction:', (error as Error).message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// DELETE /api/products/interactions/:id — admin, delete interaction
router.delete(
  '/interactions/:id',
  requireAuth,
  requireRole('super_admin', 'pharmacist'),
  async (req, res) => {
    try {
      const row = await productService.deleteInteraction(req.params.id);
      if (!row) { res.status(404).json({ error: 'Not found' }); return; }
      res.json({ data: row });
    } catch (error) {
      console.error('Error deleting interaction:', (error as Error).message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// --- Review schemas ---

const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(255).optional(),
  body: z.string().max(2000).optional(),
  reviewerName: z.string().min(1).max(100),
  images: z.array(z.object({ url: z.string().url(), alt: z.string().max(255) })).max(5).optional(),
});

// GET /api/products/:slug/reviews — get reviews for a product (public)
router.get('/:slug/reviews', async (req, res) => {
  try {
    const product = await productService.getProductBySlug(param(req, 'slug'));
    if (!product) {
      res.status(404).json({ error: 'Product not found', code: 'NOT_FOUND' });
      return;
    }

    const reviews = await db
      .select({
        id: productReviews.id,
        reviewerName: productReviews.reviewerName,
        rating: productReviews.rating,
        title: productReviews.title,
        body: productReviews.body,
        images: productReviews.images,
        isVerifiedPurchase: productReviews.isVerifiedPurchase,
        createdAt: productReviews.createdAt,
      })
      .from(productReviews)
      .where(
        and(
          eq(productReviews.productId, product.id),
          eq(productReviews.isApproved, true),
          isNull(productReviews.deletedAt)
        )
      )
      .orderBy(desc(productReviews.createdAt));

    // Aggregate stats
    const [stats] = await db
      .select({
        avgRating: avg(productReviews.rating),
        totalReviews: count(),
      })
      .from(productReviews)
      .where(
        and(
          eq(productReviews.productId, product.id),
          eq(productReviews.isApproved, true),
          isNull(productReviews.deletedAt)
        )
      );

    // Rating breakdown
    const breakdown = await db
      .select({
        rating: productReviews.rating,
        count: count(),
      })
      .from(productReviews)
      .where(
        and(
          eq(productReviews.productId, product.id),
          eq(productReviews.isApproved, true),
          isNull(productReviews.deletedAt)
        )
      )
      .groupBy(productReviews.rating);

    const ratingBreakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of breakdown) {
      ratingBreakdown[row.rating] = Number(row.count);
    }

    res.json({
      data: reviews,
      meta: {
        avgRating: stats?.avgRating ? Number(Number(stats.avgRating).toFixed(1)) : 0,
        totalReviews: Number(stats?.totalReviews ?? 0),
        ratingBreakdown,
      },
    });
  } catch (error) {
    console.error('Error getting reviews:', (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/products/:slug/reviews — submit a review (authenticated)
router.post('/:slug/reviews', requireAuth, validate(createReviewSchema), async (req, res) => {
  try {
    const auth = getAuth(req);
    const product = await productService.getProductBySlug(param(req, 'slug'));
    if (!product) {
      res.status(404).json({ error: 'Product not found', code: 'NOT_FOUND' });
      return;
    }

    // Check if this customer has purchased the product
    let isVerified = false;
    if (auth?.userId) {
      const [purchase] = await db
        .select({ id: orderItems.id })
        .from(orderItems)
        .innerJoin(orders, eq(orders.id, orderItems.orderId))
        .innerJoin(
          db.select({ id: sql`c.id`, clerkUserId: sql`c.clerk_user_id` }).from(sql`customers c`).as('cust'),
          sql`cust.clerk_user_id = ${auth.userId}`
        )
        .where(
          and(
            eq(orderItems.productId, product.id),
            eq(orders.status, 'delivered')
          )
        )
        .limit(1);
      isVerified = !!purchase;
    }

    const [review] = await db
      .insert(productReviews)
      .values({
        productId: product.id,
        reviewerName: req.body.reviewerName,
        rating: req.body.rating,
        title: req.body.title,
        body: req.body.body,
        images: req.body.images ?? null,
        isVerifiedPurchase: isVerified,
        isApproved: true, // auto-approve for authenticated users
      })
      .returning();

    res.status(201).json({ data: review });
  } catch (error) {
    console.error('Error creating review:', (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Admin routes ---

// POST /api/products — create product (admin)
router.post(
  '/',
  requireAuth,
  requireRole('super_admin', 'inventory_manager'),
  validate(createProductSchema),
  async (req, res) => {
    try {
      const product = await productService.createProduct(req.body);
      const auth = getAuth(req);
      await writeAuditLog({
        actorId: auth?.userId ?? undefined,
        actorType: 'staff',
        action: 'product.created',
        entityType: 'product',
        entityId: product.id,
        afterState: product,
      });
      res.status(201).json({ data: product });
    } catch (error) {
      console.error('Error creating product:', (error as Error).message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PUT /api/products/categories/:id — update category (admin)
// NOTE: Must be before PUT /:id so Express doesn't match "categories" as a product ID
router.put(
  '/categories/:id',
  requireAuth,
  requireRole('super_admin', 'inventory_manager'),
  validate(updateCategorySchema),
  async (req, res) => {
    try {
      const category = await productService.updateCategory(req.params.id, req.body);
      if (!category) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }
      res.json({ data: category });
    } catch (error) {
      console.error('Error updating category:', (error as Error).message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PUT /api/products/:id — update product (admin)
router.put(
  '/:id',
  requireAuth,
  requireRole('super_admin', 'inventory_manager'),
  validate(updateProductSchema),
  async (req, res) => {
    try {
      const existing = await productService.getProductById(param(req, 'id'));
      if (!existing) {
        res.status(404).json({ error: 'Product not found', code: 'NOT_FOUND' });
        return;
      }
      const product = await productService.updateProduct(param(req, 'id'), req.body);
      const auth = getAuth(req);
      await writeAuditLog({
        actorId: auth?.userId ?? undefined,
        actorType: 'staff',
        action: 'product.updated',
        entityType: 'product',
        entityId: param(req, 'id'),
        beforeState: existing,
        afterState: product,
      });
      res.json({ data: product });
    } catch (error) {
      console.error('Error updating product:', (error as Error).message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// DELETE /api/products/:id — soft delete product (admin)
router.delete(
  '/:id',
  requireAuth,
  requireRole('super_admin', 'inventory_manager'),
  async (req, res) => {
    try {
      const existing = await productService.getProductById(param(req, 'id'));
      if (!existing) {
        res.status(404).json({ error: 'Product not found', code: 'NOT_FOUND' });
        return;
      }
      await productService.softDeleteProduct(param(req, 'id'));
      const auth = getAuth(req);
      await writeAuditLog({
        actorId: auth?.userId ?? undefined,
        actorType: 'staff',
        action: 'product.deleted',
        entityType: 'product',
        entityId: param(req, 'id'),
        beforeState: existing,
      });
      res.json({ data: { message: 'Product deleted' } });
    } catch (error) {
      console.error('Error deleting product:', (error as Error).message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/products/categories — create category (admin)
router.post(
  '/categories',
  requireAuth,
  requireRole('super_admin', 'inventory_manager'),
  validate(createCategorySchema),
  async (req, res) => {
    try {
      const category = await productService.createCategory(req.body);
      res.status(201).json({ data: category });
    } catch (error) {
      console.error('Error creating category:', (error as Error).message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/products/prices — set product price (admin)
router.post(
  '/prices',
  requireAuth,
  requireRole('super_admin', 'inventory_manager'),
  validate(setPriceSchema),
  async (req, res) => {
    try {
      const price = await productService.setProductPrice(req.body);
      res.status(201).json({ data: price });
    } catch (error) {
      console.error('Error setting price:', (error as Error).message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// --- Product Pairings (Frequently Bought Together) ---

const pairingSchema = z.object({
  pairedProductId: z.string().uuid(),
  sortOrder: z.number().int().default(0),
});

// GET /api/products/:id/pairings — list manual pairings (admin)
router.get(
  '/:id/pairings',
  requireAuth,
  requireRole('super_admin', 'inventory_manager'),
  async (req, res) => {
    try {
      const rows = await db
        .select({
          id: productPairings.id,
          pairedProductId: productPairings.pairedProductId,
          sortOrder: productPairings.sortOrder,
          pairedName: products.name,
          pairedSlug: products.slug,
        })
        .from(productPairings)
        .innerJoin(products, eq(products.id, productPairings.pairedProductId))
        .where(eq(productPairings.productId, param(req, 'id')))
        .orderBy(asc(productPairings.sortOrder));
      res.json({ data: rows });
    } catch (error) {
      console.error('Error listing pairings:', (error as Error).message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/products/:id/pairings — add a pairing (admin)
router.post(
  '/:id/pairings',
  requireAuth,
  requireRole('super_admin', 'inventory_manager'),
  validate(pairingSchema),
  async (req, res) => {
    try {
      const [pairing] = await db
        .insert(productPairings)
        .values({
          productId: param(req, 'id'),
          pairedProductId: req.body.pairedProductId,
          sortOrder: req.body.sortOrder ?? 0,
        })
        .returning();
      // Invalidate FBT cache
      const { redis } = await import('../lib/redis');
      await redis.del(`fbt:${param(req, 'id')}`);
      res.status(201).json({ data: pairing });
    } catch (error) {
      console.error('Error creating pairing:', (error as Error).message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// DELETE /api/products/:id/pairings/:pairingId — remove a pairing (admin)
router.delete(
  '/:id/pairings/:pairingId',
  requireAuth,
  requireRole('super_admin', 'inventory_manager'),
  async (req, res) => {
    try {
      await db
        .delete(productPairings)
        .where(eq(productPairings.id, param(req, 'pairingId')));
      // Invalidate FBT cache
      const { redis } = await import('../lib/redis');
      await redis.del(`fbt:${param(req, 'id')}`);
      res.json({ data: { message: 'Pairing removed' } });
    } catch (error) {
      console.error('Error deleting pairing:', (error as Error).message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
