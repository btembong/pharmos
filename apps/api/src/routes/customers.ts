import { Router } from 'express';
import { z } from 'zod';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { db } from '../lib/db';
import { customers, customerAddresses } from '@pharmaflow/db';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { getAuth } from '@clerk/express';

const router: Router = Router();

const upsertCustomerSchema = z.object({
  clerkUserId: z.string().optional(),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  email: z.string().email(),
  phone: z.string().max(50).optional(),
  marketingConsent: z.boolean().default(false),
});

const addAddressSchema = z.object({
  label: z.string().max(100).optional(),
  recipientName: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  addressLine1: z.string().min(1).max(255),
  addressLine2: z.string().max(255).optional(),
  city: z.string().min(1).max(100),
  state: z.string().length(2),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/),
  isDefault: z.boolean().default(false),
});

// GET /api/customers/me — current authenticated customer profile
router.get('/me', requireAuth, async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth?.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const rows = await db
      .select()
      .from(customers)
      .where(eq(customers.clerkUserId, auth.userId))
      .limit(1);

    if (rows.length === 0) {
      res.status(404).json({ error: 'Customer not found', code: 'NOT_FOUND' });
      return;
    }
    res.json({ data: rows[0] });
  } catch (error) {
    console.error('Error getting customer profile:', (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/customers/me/addresses — current customer addresses
router.get('/me/addresses', requireAuth, async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth?.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const [customer] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.clerkUserId, auth.userId))
      .limit(1);

    if (!customer) {
      res.json({ data: [] });
      return;
    }

    const addresses = await db
      .select()
      .from(customerAddresses)
      .where(eq(customerAddresses.customerId, customer.id));

    res.json({ data: addresses });
  } catch (error) {
    console.error('Error getting addresses:', (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/customers/me/addresses — add address
router.post('/me/addresses', requireAuth, validate(addAddressSchema), async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth?.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const [customer] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.clerkUserId, auth.userId))
      .limit(1);

    if (!customer) {
      res.status(404).json({ error: 'Customer not found', code: 'NOT_FOUND' });
      return;
    }

    const [address] = await db
      .insert(customerAddresses)
      .values({ ...req.body, customerId: customer.id, country: 'US' })
      .returning();

    res.status(201).json({ data: address });
  } catch (error) {
    console.error('Error adding address:', (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/customers/me — update current customer profile
router.put('/me', requireAuth, async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth?.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { phone, dateOfBirth, marketingConsent } = req.body;
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (phone !== undefined) updateData.phone = phone;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
    if (marketingConsent !== undefined) updateData.marketingConsent = marketingConsent;

    const [updated] = await db
      .update(customers)
      .set(updateData)
      .where(eq(customers.clerkUserId, auth.userId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'Customer not found', code: 'NOT_FOUND' });
      return;
    }
    res.json({ data: updated });
  } catch (error) {
    console.error('Error updating customer profile:', (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/customers/me/addresses/:id — update address
router.put('/me/addresses/:id', requireAuth, async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth?.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const [customer] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.clerkUserId, auth.userId))
      .limit(1);

    if (!customer) {
      res.status(404).json({ error: 'Customer not found', code: 'NOT_FOUND' });
      return;
    }

    // If setting as default, unset other defaults first
    if (req.body.isDefault) {
      await db
        .update(customerAddresses)
        .set({ isDefault: false })
        .where(eq(customerAddresses.customerId, customer.id));
    }

    const [updated] = await db
      .update(customerAddresses)
      .set(req.body)
      .where(
        and(
          eq(customerAddresses.id, req.params.id),
          eq(customerAddresses.customerId, customer.id)
        )
      )
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'Address not found', code: 'NOT_FOUND' });
      return;
    }
    res.json({ data: updated });
  } catch (error) {
    console.error('Error updating address:', (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/customers/me/addresses/:id — delete address
router.delete('/me/addresses/:id', requireAuth, async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth?.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const [customer] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.clerkUserId, auth.userId))
      .limit(1);

    if (!customer) {
      res.status(404).json({ error: 'Customer not found', code: 'NOT_FOUND' });
      return;
    }

    const deleted = await db
      .delete(customerAddresses)
      .where(
        and(
          eq(customerAddresses.id, req.params.id),
          eq(customerAddresses.customerId, customer.id)
        )
      )
      .returning();

    if (deleted.length === 0) {
      res.status(404).json({ error: 'Address not found', code: 'NOT_FOUND' });
      return;
    }
    res.json({ data: { success: true } });
  } catch (error) {
    console.error('Error deleting address:', (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Admin routes ---

// GET /api/customers — list all customers (admin)
router.get(
  '/',
  requireAuth,
  requireRole('super_admin', 'customer_support'),
  async (req, res) => {
    try {
      const limit = Number(req.query.limit) || 50;
      const rows = await db
        .select()
        .from(customers)
        .where(isNull(customers.deletedAt))
        .orderBy(desc(customers.createdAt))
        .limit(limit);
      res.json({ data: rows, meta: { total: rows.length } });
    } catch (error) {
      console.error('Error listing customers:', (error as Error).message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/customers/:id — get customer by ID (admin)
router.get(
  '/:id',
  requireAuth,
  requireRole('super_admin', 'customer_support'),
  async (req, res) => {
    try {
      const rows = await db
        .select()
        .from(customers)
        .where(eq(customers.id, req.params.id))
        .limit(1);
      if (rows.length === 0) {
        res.status(404).json({ error: 'Customer not found', code: 'NOT_FOUND' });
        return;
      }
      res.json({ data: rows[0] });
    } catch (error) {
      console.error('Error getting customer:', (error as Error).message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/customers — upsert customer (used internally by webhook)
export async function upsertCustomerFromClerk(data: {
  clerkUserId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}): Promise<void> {
  const existing = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.clerkUserId, data.clerkUserId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(customers)
      .set({
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        updatedAt: new Date(),
      })
      .where(eq(customers.clerkUserId, data.clerkUserId));
  } else {
    await db.insert(customers).values({
      clerkUserId: data.clerkUserId,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
    });
  }
}

export default router;
