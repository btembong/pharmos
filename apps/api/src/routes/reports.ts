import { Router } from 'express';
import { sql } from 'drizzle-orm';
import { db } from '../lib/db';
import { orders, payments, inventoryBatches, products } from '@pharmaflow/db/schema';
import { requireAuth, requireRole } from '../middleware/auth';

const router: Router = Router();

// GET /api/reports/summary — dashboard summary stats
router.get(
  '/summary',
  requireAuth,
  requireRole('super_admin', 'finance', 'inventory_manager'),
  async (_req, res) => {
    try {
      const [orderStats] = await db
        .select({
          total: sql<number>`COUNT(*)`,
          pendingPayment: sql<number>`COUNT(*) FILTER (WHERE status = 'pending_payment')`,
          confirmed: sql<number>`COUNT(*) FILTER (WHERE status = 'confirmed')`,
          processing: sql<number>`COUNT(*) FILTER (WHERE status = 'processing')`,
          dispatched: sql<number>`COUNT(*) FILTER (WHERE status = 'dispatched')`,
          delivered: sql<number>`COUNT(*) FILTER (WHERE status = 'delivered')`,
          cancelled: sql<number>`COUNT(*) FILTER (WHERE status = 'cancelled')`,
        })
        .from(orders);

      const [revenueStats] = await db
        .select({
          totalRevenue: sql<string>`COALESCE(SUM(amount), 0)`,
          todayRevenue: sql<string>`COALESCE(SUM(amount) FILTER (WHERE confirmed_at::date = CURRENT_DATE), 0)`,
          paymentCount: sql<number>`COUNT(*)`,
        })
        .from(payments);

      const [productStats] = await db
        .select({
          total: sql<number>`COUNT(*)`,
          active: sql<number>`COUNT(*) FILTER (WHERE is_active = true)`,
        })
        .from(products);

      const [inventoryStats] = await db
        .select({
          totalBatches: sql<number>`COUNT(*)`,
          lowStock: sql<number>`COUNT(*) FILTER (WHERE quantity_on_hand - quantity_reserved < 10 AND quantity_on_hand > 0)`,
          outOfStock: sql<number>`COUNT(*) FILTER (WHERE quantity_on_hand <= 0)`,
          expiringSoon: sql<number>`COUNT(*) FILTER (WHERE expiry_date <= CURRENT_DATE + INTERVAL '30 days' AND quantity_on_hand > 0)`,
        })
        .from(inventoryBatches);

      res.json({
        data: {
          orders: orderStats,
          revenue: {
            total: Number(revenueStats.totalRevenue),
            today: Number(revenueStats.todayRevenue),
            paymentCount: revenueStats.paymentCount,
          },
          products: productStats,
          inventory: inventoryStats,
        },
      });
    } catch (error) {
      console.error('Error generating summary report:', (error as Error).message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/reports/revenue — revenue by day (last 30 days)
router.get(
  '/revenue',
  requireAuth,
  requireRole('super_admin', 'finance'),
  async (_req, res) => {
    try {
      const rows = await db.execute(sql`
        SELECT
          confirmed_at::date AS date,
          COUNT(*) AS payment_count,
          SUM(amount) AS total
        FROM payments
        WHERE confirmed_at IS NOT NULL
          AND confirmed_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY confirmed_at::date
        ORDER BY date DESC
      `);
      res.json({ data: rows.rows });
    } catch (error) {
      console.error('Error generating revenue report:', (error as Error).message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
