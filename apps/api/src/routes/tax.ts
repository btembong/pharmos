import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as taxService from '../services/tax.service';

const router = Router();

// POST /api/tax/calculate — public, calculate tax for cart items
const calculateSchema = z.object({
  state: z.string().length(2),
  items: z.array(
    z.object({
      price: z.number().positive(),
      quantity: z.number().int().positive(),
      categorySlug: z.string().nullable(),
    })
  ),
});

router.post('/calculate', validate(calculateSchema), async (req, res) => {
  try {
    const result = await taxService.calculateTax(req.body.state, req.body.items);
    res.json({ data: result });
  } catch (error) {
    console.error('Tax calculation error:', (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/tax/rates — admin, list all tax rates
router.get(
  '/rates',
  requireAuth,
  requireRole('super_admin', 'finance'),
  async (_req, res) => {
    try {
      const rates = await taxService.listTaxRates();
      res.json({ data: rates });
    } catch (error) {
      console.error('Error listing tax rates:', (error as Error).message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/tax/rates — admin, upsert a tax rate
const upsertSchema = z.object({
  state: z.string().length(2),
  productType: z.string().min(1).max(30),
  rate: z.number().min(0).max(1),
});

router.post(
  '/rates',
  requireAuth,
  requireRole('super_admin', 'finance'),
  validate(upsertSchema),
  async (req, res) => {
    try {
      const result = await taxService.upsertTaxRate(req.body.state, req.body.productType, req.body.rate);
      res.json({ data: result });
    } catch (error) {
      console.error('Error upserting tax rate:', (error as Error).message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// DELETE /api/tax/rates/:id — admin, delete a tax rate
router.delete(
  '/rates/:id',
  requireAuth,
  requireRole('super_admin', 'finance'),
  async (req, res) => {
    try {
      const result = await taxService.deleteTaxRate(req.params.id);
      if (!result) {
        res.status(404).json({ error: 'Tax rate not found', code: 'NOT_FOUND' });
        return;
      }
      res.json({ data: result });
    } catch (error) {
      console.error('Error deleting tax rate:', (error as Error).message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
