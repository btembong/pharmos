import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate, validateQuery } from '../middleware/validate';
import { db } from '../lib/db';
import { blogPosts, newsletterSubscribers } from '@pharmaflow/db/schema';
import { eq, and, isNull, desc, sql, like, or } from 'drizzle-orm';

const router = Router();

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createPostSchema = z.object({
  slug: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
  excerpt: z.string().max(500).optional(),
  body: z.string().optional(),
  featuredImage: z.string().url().optional(),
  featuredImageAlt: z.string().max(255).optional(),
  author: z.string().max(100).optional(),
  authorTitle: z.string().max(100).optional(),
  category: z.string().max(50).optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['draft', 'published']).default('draft'),
  publishedAt: z.string().datetime().optional(),
  metaTitle: z.string().max(60).optional(),
  metaDescription: z.string().max(160).optional(),
  relatedProductSlugs: z.array(z.string()).optional(),
  readingTimeMinutes: z.string().max(5).optional(),
});

const updatePostSchema = createPostSchema.partial();

const listQuerySchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  status: z.enum(['draft', 'published', 'all']).default('published'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

const subscribeSchema = z.object({
  email: z.string().email(),
  source: z.string().max(50).optional(),
});

// ─── Public Routes ─────────────────────────────────────────────────────────────

// GET /api/blog — list published posts
router.get('/', validateQuery(listQuerySchema), async (req, res) => {
  try {
    const { category, search, page, limit } = req.query as any;
    const offset = (page - 1) * limit;

    const conditions = [
      eq(blogPosts.status, 'published'),
      isNull(blogPosts.deletedAt),
    ];

    if (category) conditions.push(eq(blogPosts.category, category));
    if (search) {
      conditions.push(
        or(
          like(blogPosts.title, `%${search}%`),
          like(blogPosts.excerpt, `%${search}%`)
        )!
      );
    }

    const [posts, [{ total }]] = await Promise.all([
      db
        .select({
          id: blogPosts.id,
          slug: blogPosts.slug,
          title: blogPosts.title,
          excerpt: blogPosts.excerpt,
          featuredImage: blogPosts.featuredImage,
          featuredImageAlt: blogPosts.featuredImageAlt,
          author: blogPosts.author,
          authorTitle: blogPosts.authorTitle,
          category: blogPosts.category,
          tags: blogPosts.tags,
          publishedAt: blogPosts.publishedAt,
          readingTimeMinutes: blogPosts.readingTimeMinutes,
        })
        .from(blogPosts)
        .where(and(...conditions))
        .orderBy(desc(blogPosts.publishedAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(blogPosts)
        .where(and(...conditions)),
    ]);

    res.json({ data: posts, meta: { total, page, limit } });
  } catch (error) {
    console.error('Error listing blog posts:', (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/blog/categories — distinct categories in use
router.get('/categories', async (_req, res) => {
  try {
    const rows = await db
      .selectDistinct({ category: blogPosts.category })
      .from(blogPosts)
      .where(and(eq(blogPosts.status, 'published'), isNull(blogPosts.deletedAt)));

    res.json({ data: rows.map((r) => r.category).filter(Boolean) });
  } catch (error) {
    console.error('Error listing blog categories:', (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/blog/:slug — get single post (public for published, admin for draft)
router.get('/:slug', async (req, res) => {
  try {
    const [post] = await db
      .select()
      .from(blogPosts)
      .where(
        and(
          eq(blogPosts.slug, req.params.slug),
          isNull(blogPosts.deletedAt)
        )
      )
      .limit(1);

    if (!post) {
      res.status(404).json({ error: 'Post not found', code: 'NOT_FOUND' });
      return;
    }

    // Only show published posts to public (draft requires admin)
    if (post.status !== 'published') {
      res.status(404).json({ error: 'Post not found', code: 'NOT_FOUND' });
      return;
    }

    res.json({ data: post });
  } catch (error) {
    console.error('Error getting blog post:', (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/blog/subscribe — newsletter subscribe
router.post('/subscribe', validate(subscribeSchema), async (req, res) => {
  try {
    const { email, source } = req.body;

    const existing = await db
      .select({ id: newsletterSubscribers.id, status: newsletterSubscribers.status })
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.email, email))
      .limit(1);

    if (existing.length > 0) {
      if (existing[0].status === 'active') {
        res.json({ data: { message: 'Already subscribed' } });
        return;
      }
      // Resubscribe
      await db
        .update(newsletterSubscribers)
        .set({ status: 'active', unsubscribedAt: null })
        .where(eq(newsletterSubscribers.email, email));
    } else {
      await db
        .insert(newsletterSubscribers)
        .values({ email, source: source ?? 'footer' });
    }

    res.status(201).json({ data: { message: 'Subscribed successfully' } });
  } catch (error) {
    console.error('Error subscribing:', (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Admin Routes ──────────────────────────────────────────────────────────────

// GET /api/blog/admin/all — list all posts including drafts
router.get(
  '/admin/all',
  requireAuth,
  requireRole('super_admin'),
  validateQuery(listQuerySchema),
  async (req, res) => {
    try {
      const { status, search, page, limit } = req.query as any;
      const offset = (page - 1) * limit;

      const conditions = [isNull(blogPosts.deletedAt)];
      if (status && status !== 'all') conditions.push(eq(blogPosts.status, status));
      if (search) {
        conditions.push(
          or(
            like(blogPosts.title, `%${search}%`),
            like(blogPosts.excerpt, `%${search}%`)
          )!
        );
      }

      const [posts, [{ total }]] = await Promise.all([
        db
          .select({
            id: blogPosts.id,
            slug: blogPosts.slug,
            title: blogPosts.title,
            excerpt: blogPosts.excerpt,
            category: blogPosts.category,
            status: blogPosts.status,
            author: blogPosts.author,
            publishedAt: blogPosts.publishedAt,
            createdAt: blogPosts.createdAt,
            updatedAt: blogPosts.updatedAt,
          })
          .from(blogPosts)
          .where(and(...conditions))
          .orderBy(desc(blogPosts.updatedAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ total: sql<number>`count(*)::int` })
          .from(blogPosts)
          .where(and(...conditions)),
      ]);

      res.json({ data: posts, meta: { total, page, limit } });
    } catch (error) {
      console.error('Error listing admin blog posts:', (error as Error).message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/blog/admin/:id — get full post by ID (for editing)
router.get(
  '/admin/:id',
  requireAuth,
  requireRole('super_admin'),
  async (req, res) => {
    try {
      const [post] = await db
        .select()
        .from(blogPosts)
        .where(and(eq(blogPosts.id, req.params.id), isNull(blogPosts.deletedAt)))
        .limit(1);

      if (!post) {
        res.status(404).json({ error: 'Post not found' });
        return;
      }

      res.json({ data: post });
    } catch (error) {
      console.error('Error getting blog post:', (error as Error).message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/blog — create post (admin)
router.post(
  '/',
  requireAuth,
  requireRole('super_admin'),
  validate(createPostSchema),
  async (req, res) => {
    try {
      const body = req.body;
      const now = new Date();
      const publishedAt =
        body.status === 'published'
          ? body.publishedAt
            ? new Date(body.publishedAt)
            : now
          : null;

      const [post] = await db
        .insert(blogPosts)
        .values({
          ...body,
          publishedAt,
          updatedAt: now,
        })
        .returning();

      res.status(201).json({ data: post });
    } catch (error) {
      console.error('Error creating blog post:', (error as Error).message);
      if ((error as any).code === '23505') {
        res.status(409).json({ error: 'A post with this slug already exists' });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PUT /api/blog/:id — update post (admin)
router.put(
  '/:id',
  requireAuth,
  requireRole('super_admin'),
  validate(updatePostSchema),
  async (req, res) => {
    try {
      const [existing] = await db
        .select({ id: blogPosts.id, status: blogPosts.status, publishedAt: blogPosts.publishedAt })
        .from(blogPosts)
        .where(and(eq(blogPosts.id, req.params.id), isNull(blogPosts.deletedAt)))
        .limit(1);

      if (!existing) {
        res.status(404).json({ error: 'Post not found' });
        return;
      }

      const body = req.body;
      const now = new Date();

      // Auto-set publishedAt when publishing for the first time
      let publishedAt = existing.publishedAt;
      if (body.status === 'published' && !existing.publishedAt) {
        publishedAt = body.publishedAt ? new Date(body.publishedAt) : now;
      }
      if (body.status === 'draft') {
        publishedAt = null;
      }

      const [post] = await db
        .update(blogPosts)
        .set({ ...body, publishedAt, updatedAt: now })
        .where(eq(blogPosts.id, req.params.id))
        .returning();

      res.json({ data: post });
    } catch (error) {
      console.error('Error updating blog post:', (error as Error).message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// DELETE /api/blog/:id — soft delete (admin)
router.delete(
  '/:id',
  requireAuth,
  requireRole('super_admin'),
  async (req, res) => {
    try {
      const [post] = await db
        .update(blogPosts)
        .set({ deletedAt: new Date() })
        .where(and(eq(blogPosts.id, req.params.id), isNull(blogPosts.deletedAt)))
        .returning({ id: blogPosts.id });

      if (!post) {
        res.status(404).json({ error: 'Post not found' });
        return;
      }

      res.json({ data: { message: 'Post deleted' } });
    } catch (error) {
      console.error('Error deleting blog post:', (error as Error).message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/blog/admin/subscribers — list newsletter subscribers
router.get(
  '/admin/subscribers',
  requireAuth,
  requireRole('super_admin'),
  async (_req, res) => {
    try {
      const subscribers = await db
        .select()
        .from(newsletterSubscribers)
        .orderBy(desc(newsletterSubscribers.createdAt));
      res.json({ data: subscribers });
    } catch (error) {
      console.error('Error listing subscribers:', (error as Error).message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
