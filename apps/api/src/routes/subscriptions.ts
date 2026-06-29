import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { getAuth } from '@clerk/express';
import { db } from '../lib/db';
import { customers } from '@pharmaflow/db/schema';
import { eq } from 'drizzle-orm';
import * as subscriptionService from '../services/subscription.service';

const router = Router();

// Helper: resolve customerId from Clerk userId
async function getCustomerId(clerkUserId: string): Promise<string | null> {
  const customer = await db.query.customers.findFirst({
    where: eq(customers.clerkUserId, clerkUserId),
    columns: { id: true },
  });
  return customer?.id ?? null;
}

// --- Customer routes ---

// GET /api/subscriptions/me — list my subscriptions
router.get('/me', requireAuth, async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth?.userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const customerId = await getCustomerId(auth.userId);
    if (!customerId) { res.json({ data: [] }); return; }
    const subs = await subscriptionService.getCustomerSubscriptions(customerId);
    res.json({ data: subs });
  } catch (error) {
    console.error('Error getting subscriptions:', (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/subscriptions — create subscription
const createSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive().default(1),
  frequencyDays: z.number().int().min(7).max(365),
  deliveryAddressId: z.string().uuid().optional(),
});

router.post('/', requireAuth, validate(createSchema), async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth?.userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const customerId = await getCustomerId(auth.userId);
    if (!customerId) { res.status(400).json({ error: 'Customer profile not found' }); return; }
    const sub = await subscriptionService.createSubscription({ ...req.body, customerId });
    res.status(201).json({ data: sub });
  } catch (error) {
    console.error('Error creating subscription:', (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/subscriptions/:id — update subscription
const updateSchema = z.object({
  quantity: z.number().int().positive().optional(),
  frequencyDays: z.number().int().min(7).max(365).optional(),
  deliveryAddressId: z.string().uuid().optional(),
});

router.put('/:id', requireAuth, validate(updateSchema), async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth?.userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const customerId = await getCustomerId(auth.userId);
    if (!customerId) { res.status(400).json({ error: 'Customer not found' }); return; }
    const sub = await subscriptionService.updateSubscription(req.params.id, customerId, req.body);
    if (!sub) { res.status(404).json({ error: 'Subscription not found' }); return; }
    res.json({ data: sub });
  } catch (error) {
    console.error('Error updating subscription:', (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/subscriptions/:id/pause — pause subscription
router.post('/:id/pause', requireAuth, async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth?.userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const customerId = await getCustomerId(auth.userId);
    if (!customerId) { res.status(400).json({ error: 'Customer not found' }); return; }
    const pauseDays = Number(req.body.pauseDays) || 30;
    const sub = await subscriptionService.pauseSubscription(req.params.id, customerId, pauseDays);
    if (!sub) { res.status(404).json({ error: 'Subscription not found' }); return; }
    res.json({ data: sub });
  } catch (error) {
    console.error('Error pausing subscription:', (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/subscriptions/:id/resume — resume subscription
router.post('/:id/resume', requireAuth, async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth?.userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const customerId = await getCustomerId(auth.userId);
    if (!customerId) { res.status(400).json({ error: 'Customer not found' }); return; }
    const sub = await subscriptionService.resumeSubscription(req.params.id, customerId);
    if (!sub) { res.status(404).json({ error: 'Subscription not found' }); return; }
    res.json({ data: sub });
  } catch (error) {
    console.error('Error resuming subscription:', (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/subscriptions/:id/cancel — cancel subscription
router.post('/:id/cancel', requireAuth, async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth?.userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const customerId = await getCustomerId(auth.userId);
    if (!customerId) { res.status(400).json({ error: 'Customer not found' }); return; }
    const sub = await subscriptionService.cancelSubscription(req.params.id, customerId, req.body.reason);
    if (!sub) { res.status(404).json({ error: 'Subscription not found' }); return; }
    res.json({ data: sub });
  } catch (error) {
    console.error('Error cancelling subscription:', (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Admin routes ---

// GET /api/subscriptions/admin/all — list all subscriptions
router.get(
  '/admin/all',
  requireAuth,
  requireRole('super_admin'),
  async (req, res) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const result = await subscriptionService.listAllSubscriptions(page, limit);
      res.json(result);
    } catch (error) {
      console.error('Error listing subscriptions:', (error as Error).message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
