import { Router, type Request } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate, validateQuery } from '../middleware/validate';
import { writeAuditLog } from '../lib/audit';
import { getAuth } from '@clerk/express';
import * as inventoryService from '../services/inventory.service';

const router: Router = Router();

function param(req: Request, name: string): string {
  return req.params[name] as string;
}

// --- Schemas ---

const listBatchesQuery = z.object({
  productId: z.string().uuid().optional(),
  isQuarantined: z.coerce.boolean().optional(),
  expiringWithinDays: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const addBatchSchema = z.object({
  productId: z.string().uuid(),
  batchNumber: z.string().min(1).max(100),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  manufactureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  quantityReceived: z.number().int().positive(),
  costPrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.string().default('USD'),
  location: z.string().max(100).optional(),
});

const updateBatchSchema = z.object({
  isQuarantined: z.boolean().optional(),
  quarantineReason: z.string().optional(),
  location: z.string().max(100).optional(),
});

// --- Routes ---

// GET /api/inventory/batches — list batches
router.get(
  '/batches',
  requireAuth,
  requireRole('super_admin', 'inventory_manager', 'pharmacist'),
  validateQuery(listBatchesQuery),
  async (req, res) => {
    try {
      const result = await inventoryService.listBatches(req.query as any);
      res.json(result);
    } catch (error) {
      console.error('Error listing batches:', (error as Error).message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/inventory/batches — add batch (receive stock)
router.post(
  '/batches',
  requireAuth,
  requireRole('super_admin', 'inventory_manager'),
  validate(addBatchSchema),
  async (req, res) => {
    try {
      const auth = getAuth(req);
      const batch = await inventoryService.addBatch(req.body, auth?.userId ?? undefined);

      await writeAuditLog({
        actorId: auth?.userId ?? undefined,
        actorType: 'staff',
        action: 'inventory.batch_received',
        entityType: 'inventory_batch',
        entityId: batch.id,
        afterState: batch,
      });

      res.status(201).json({ data: batch });
    } catch (error) {
      console.error('Error adding batch:', (error as Error).message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PUT /api/inventory/batches/:id — update batch (quarantine, location)
router.put(
  '/batches/:id',
  requireAuth,
  requireRole('super_admin', 'inventory_manager'),
  validate(updateBatchSchema),
  async (req, res) => {
    try {
      const batch = await inventoryService.updateBatch(param(req, 'id'), req.body);
      if (!batch) {
        res.status(404).json({ error: 'Batch not found', code: 'NOT_FOUND' });
        return;
      }

      const auth = getAuth(req);
      await writeAuditLog({
        actorId: auth?.userId ?? undefined,
        actorType: 'staff',
        action: 'inventory.batch_updated',
        entityType: 'inventory_batch',
        entityId: batch.id,
        afterState: batch,
      });

      res.json({ data: batch });
    } catch (error) {
      console.error('Error updating batch:', (error as Error).message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// --- Cart Soft Reservations (public) ---

const softReserveSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  cartSessionId: z.string().uuid(),
});

const releaseReserveSchema = z.object({
  productId: z.string().uuid(),
  cartSessionId: z.string().uuid(),
});

const releaseAllSchema = z.object({
  cartSessionId: z.string().uuid(),
});

// POST /api/inventory/cart/reserve — soft reserve stock for cart item
router.post('/cart/reserve', validate(softReserveSchema), async (req, res) => {
  try {
    const { productId, quantity, cartSessionId } = req.body;
    const result = await inventoryService.softReserve(productId, quantity, cartSessionId);
    res.json({ data: result });
  } catch (error) {
    const msg = (error as Error).message;
    if (msg === 'INSUFFICIENT_STOCK') {
      res.status(409).json({ error: 'Insufficient stock available', code: 'INSUFFICIENT_STOCK' });
      return;
    }
    console.error('Error reserving stock:', msg);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/inventory/cart/release — release soft reservation for one product
router.post('/cart/release', validate(releaseReserveSchema), async (req, res) => {
  try {
    const { productId, cartSessionId } = req.body;
    await inventoryService.releaseSoftReservation(productId, cartSessionId);
    res.json({ data: { success: true } });
  } catch (error) {
    console.error('Error releasing reservation:', (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/inventory/cart/release-all — release all soft reservations for a cart session
router.post('/cart/release-all', validate(releaseAllSchema), async (req, res) => {
  try {
    await inventoryService.releaseAllCartReservations(req.body.cartSessionId);
    res.json({ data: { success: true } });
  } catch (error) {
    console.error('Error releasing all reservations:', (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/inventory/availability/bulk — bulk availability check (public)
router.post('/availability/bulk', async (req, res) => {
  try {
    const { productIds } = req.body as { productIds: string[] };
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.json({ data: {} });
    }
    const ids = productIds.slice(0, 50); // limit to 50
    const results: Record<string, { available: number; status: string }> = {};
    await Promise.all(
      ids.map(async (id) => {
        results[id] = await inventoryService.getProductAvailability(id);
      })
    );
    res.json({ data: results });
  } catch (error) {
    console.error('Error getting bulk availability:', (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/inventory/availability/:productId — get product availability (public)
router.get('/availability/:productId', async (req, res) => {
  try {
    const availability = await inventoryService.getProductAvailability(param(req, 'productId'));
    res.json({ data: availability });
  } catch (error) {
    console.error('Error getting availability:', (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/inventory/alerts — low stock + expiry alerts
router.get(
  '/alerts',
  requireAuth,
  requireRole('super_admin', 'inventory_manager'),
  async (req, res) => {
    try {
      const [lowStock, expiring] = await Promise.all([
        inventoryService.getLowStockAlerts(),
        inventoryService.getExpiryAlerts(Number(req.query.expiryDays) || 90),
      ]);
      res.json({ data: { lowStock, expiring } });
    } catch (error) {
      console.error('Error getting alerts:', (error as Error).message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
