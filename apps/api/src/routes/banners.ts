import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { db } from '../lib/db';
import { banners } from '@pharmaflow/db/schema';
import { eq, and, isNull, asc } from 'drizzle-orm';
import { z } from 'zod';

const router: Router = Router();

// ─── Schemas ─────────────────────────────────────────────────────────────────

const createBannerSchema = z.object({
  placement: z.string().max(50).default('homepage_hero'),
  title: z.string().min(1).max(255),
  highlight: z.string().max(255).optional(),
  description: z.string().optional(),
  badgeText: z.string().max(100).optional(),
  ctaLabel: z.string().max(100).optional(),
  ctaUrl: z.string().max(500).optional(),
  imageUrl: z.string().optional(),
  overlayOpacity: z.number().int().min(0).max(100).default(60),
  textColor: z.enum(['light', 'dark']).default('light'),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

const updateBannerSchema = createBannerSchema.partial();

// ─── Public: GET /api/banners?placement=homepage_hero ────────────────────────

router.get('/', async (req, res) => {
  try {
    const placement = (req.query.placement as string) || 'homepage_hero';

    const results = await db
      .select()
      .from(banners)
      .where(
        and(
          eq(banners.placement, placement),
          eq(banners.isActive, true),
          isNull(banners.deletedAt)
        )
      )
      .orderBy(asc(banners.sortOrder));

    res.json({ data: results });
  } catch (error) {
    console.error('Error fetching banners:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Admin: GET /api/banners/all ─────────────────────────────────────────────

router.get('/all', requireAuth, async (_req, res) => {
  try {
    const results = await db
      .select()
      .from(banners)
      .where(isNull(banners.deletedAt))
      .orderBy(asc(banners.sortOrder));

    res.json({ data: results });
  } catch (error) {
    console.error('Error fetching all banners:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Admin: POST /api/banners ────────────────────────────────────────────────

router.post('/', requireAuth, async (req, res) => {
  try {
    const body = createBannerSchema.parse(req.body);

    const [banner] = await db
      .insert(banners)
      .values(body)
      .returning();

    res.status(201).json({ data: banner });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    console.error('Error creating banner:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Admin: PUT /api/banners/:id ─────────────────────────────────────────────

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const body = updateBannerSchema.parse(req.body);

    const [updated] = await db
      .update(banners)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(banners.id, id), isNull(banners.deletedAt)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'Banner not found' });
      return;
    }

    res.json({ data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    console.error('Error updating banner:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Admin: DELETE /api/banners/:id (soft delete) ────────────────────────────

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const [deleted] = await db
      .update(banners)
      .set({ deletedAt: new Date() })
      .where(and(eq(banners.id, id), isNull(banners.deletedAt)))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: 'Banner not found' });
      return;
    }

    res.json({ data: { message: 'Banner deleted' } });
  } catch (error) {
    console.error('Error deleting banner:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
