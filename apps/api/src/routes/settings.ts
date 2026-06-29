import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { db } from '../lib/db';
import { paymentMethods } from '@pharmaflow/db/schema';
import { eq, asc } from 'drizzle-orm';

const router = Router();

// --- Payment Methods (admin-configurable) ---

// GET /api/settings/payment-methods — public (shown on checkout)
router.get('/payment-methods', async (_req, res) => {
  try {
    const methods = await db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.isActive, true))
      .orderBy(asc(paymentMethods.sortOrder));
    res.json({ data: methods });
  } catch (error) {
    console.error('Error listing payment methods:', (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const upsertPaymentMethodSchema = z.object({
  method: z.string().min(1).max(50),
  label: z.string().min(1).max(100),
  details: z.string().min(1),
  instructions: z.string().optional(),
  icon: z.string().max(50).optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

// POST /api/settings/payment-methods — create/update payment method (admin)
router.post(
  '/payment-methods',
  requireAuth,
  requireRole('super_admin'),
  validate(upsertPaymentMethodSchema),
  async (req, res) => {
    try {
      // Upsert by method name
      const existing = await db.query.paymentMethods.findFirst({
        where: eq(paymentMethods.method, req.body.method),
      });

      if (existing) {
        const [updated] = await db
          .update(paymentMethods)
          .set({ ...req.body, updatedAt: new Date() })
          .where(eq(paymentMethods.id, existing.id))
          .returning();
        res.json({ data: updated });
      } else {
        const [created] = await db.insert(paymentMethods).values(req.body).returning();
        res.status(201).json({ data: created });
      }
    } catch (error) {
      console.error('Error saving payment method:', (error as Error).message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
