import { Router } from 'express';
import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import { db } from '../lib/db';
import { payments, paymentMethods } from '@pharmaflow/db';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { writeAuditLog } from '../lib/audit';
import { getAuth } from '@clerk/express';

const router: Router = Router();

const upsertPaymentMethodSchema = z.object({
  method: z.enum(['zelle', 'venmo', 'cashapp', 'wire_transfer', 'check', 'cash']),
  label: z.string().min(1).max(100),
  details: z.string().min(1),
  instructions: z.string().optional(),
  icon: z.string().max(50).optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

// GET /api/payments/methods — public, used by storefront checkout page
router.get('/methods', async (_req, res) => {
  try {
    const methods = await db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.isActive, true))
      .orderBy(paymentMethods.sortOrder);
    res.json({ data: methods });
  } catch (error) {
    console.error('Error listing payment methods:', (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/payments — list payments (finance / admin)
router.get(
  '/',
  requireAuth,
  requireRole('super_admin', 'finance'),
  async (req, res) => {
    try {
      const limit = Number(req.query.limit) || 50;
      const rows = await db
        .select()
        .from(payments)
        .orderBy(desc(payments.createdAt))
        .limit(limit);
      res.json({ data: rows });
    } catch (error) {
      console.error('Error listing payments:', (error as Error).message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/payments/:id — get single payment
router.get(
  '/:id',
  requireAuth,
  requireRole('super_admin', 'finance'),
  async (req, res) => {
    try {
      const rows = await db
        .select()
        .from(payments)
        .where(eq(payments.id, req.params.id))
        .limit(1);
      if (rows.length === 0) {
        res.status(404).json({ error: 'Payment not found', code: 'NOT_FOUND' });
        return;
      }
      res.json({ data: rows[0] });
    } catch (error) {
      console.error('Error getting payment:', (error as Error).message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/payments/methods — create payment method (admin)
router.post(
  '/methods',
  requireAuth,
  requireRole('super_admin'),
  validate(upsertPaymentMethodSchema),
  async (req, res) => {
    try {
      const auth = getAuth(req);
      const [method] = await db
        .insert(paymentMethods)
        .values(req.body)
        .returning();
      await writeAuditLog({
        actorId: auth?.userId ?? undefined,
        actorType: 'staff',
        action: 'payment_method.created',
        entityType: 'payment_method',
        entityId: method.id,
        afterState: method,
      });
      res.status(201).json({ data: method });
    } catch (error) {
      console.error('Error creating payment method:', (error as Error).message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PUT /api/payments/methods/:id — update payment method (admin)
router.put(
  '/methods/:id',
  requireAuth,
  requireRole('super_admin'),
  validate(upsertPaymentMethodSchema.partial()),
  async (req, res) => {
    try {
      const auth = getAuth(req);
      const [updated] = await db
        .update(paymentMethods)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(paymentMethods.id, req.params.id))
        .returning();
      if (!updated) {
        res.status(404).json({ error: 'Payment method not found', code: 'NOT_FOUND' });
        return;
      }
      await writeAuditLog({
        actorId: auth?.userId ?? undefined,
        actorType: 'staff',
        action: 'payment_method.updated',
        entityType: 'payment_method',
        entityId: req.params.id,
        afterState: updated,
      });
      res.json({ data: updated });
    } catch (error) {
      console.error('Error updating payment method:', (error as Error).message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
