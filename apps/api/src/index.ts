import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { clerkMiddleware } from '@clerk/express';
import productRoutes from './routes/products';
import inventoryRoutes from './routes/inventory';
import orderRoutes from './routes/orders';
import deliveryRoutes from './routes/delivery';
import settingsRoutes from './routes/settings';
import paymentsRoutes from './routes/payments';
import customersRoutes from './routes/customers';
import webhooksRoutes from './routes/webhooks';
import reportsRoutes from './routes/reports';
import uploadsRoutes from './routes/uploads';
import bannersRoutes from './routes/banners';
import taxRoutes from './routes/tax';
import subscriptionsRoutes from './routes/subscriptions';
import aiRoutes from './routes/ai';
import pushRoutes from './routes/push';
import { db } from './lib/db';
import { stockReservations, inventoryBatches } from '@pharmaflow/db/schema';
import { and, isNull, lt, sql, eq } from 'drizzle-orm';
import { redis } from './lib/redis';
import { getLowStockAlerts, getExpiryAlerts } from './services/inventory.service';
import { notificationService } from './services/notification.service';
import { syncCustomer } from './middleware/sync-customer';

const app = express();
const PORT = process.env.PORT || 3001;

// Global middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : ['http://localhost:3000'],
  credentials: true,
}));
app.use(express.json());
app.use(clerkMiddleware());
app.use(syncCustomer);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Clerk webhook needs raw body for signature verification
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhooksRoutes);

// Test email endpoint (dev only)
app.get('/api/test-email', async (_req, res) => {
  try {
    await notificationService.send('order.pending_payment', {
      customer: {
        email: 'ndanwemarcel@gmail.com',
        name: 'Marcel',
        phone: null,
      },
      order: {
        orderNumber: 'PF-2026-000001',
        total: 149.99,
      },
    });
    res.json({ data: { message: 'Test email sent to ndanwemarcel@gmail.com' } });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Routes
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/banners', bannersRoutes);
app.use('/api/tax', taxRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/push', pushRoutes);

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err.stack || err.message);
  res.status(500).json({ error: 'Internal server error', detail: err.message });
});

app.listen(PORT, () => {
  console.log(`PharmaFlow API running on http://localhost:${PORT}`);
});

// ─── Cron Jobs ────────────────────────────────────────────────────────────────

// Every 5 minutes — release expired soft reservations from DB
cron.schedule('*/5 * * * *', async () => {
  try {
    const expired = await db
      .select({ id: stockReservations.id, batchId: stockReservations.batchId, productId: stockReservations.productId, quantity: stockReservations.quantity })
      .from(stockReservations)
      .where(
        and(
          eq(stockReservations.reservationType, 'soft'),
          isNull(stockReservations.releasedAt),
          lt(stockReservations.expiresAt, new Date())
        )
      );

    if (expired.length === 0) return;

    for (const res of expired) {
      await db
        .update(inventoryBatches)
        .set({ quantityReserved: sql`GREATEST(quantity_reserved - ${res.quantity}, 0)` })
        .where(eq(inventoryBatches.id, res.batchId));
      await redis.del(`atp:${res.productId}`);
    }

    await db
      .update(stockReservations)
      .set({ releasedAt: new Date() })
      .where(
        and(
          eq(stockReservations.reservationType, 'soft'),
          isNull(stockReservations.releasedAt),
          lt(stockReservations.expiresAt, new Date())
        )
      );

    console.log(`[cron] Released ${expired.length} expired soft reservations`);
  } catch (err) {
    console.error('[cron] releaseExpiredReservations error:', err);
  }
});

// Every 5 minutes — invalidate stale ATP cache keys (Upstash TTL handles expiry naturally)
cron.schedule('*/5 * * * *', async () => {
  try {
    // ATP cache expires via Upstash TTL (300s). This job is a no-op guard.
    // If needed, force-clear all atp:* keys here.
  } catch (err) {
    console.error('[cron] refreshATPCache error:', err);
  }
});

// Daily at 7:00 AM ET — expiry alerts (90 / 60 / 30 day warnings)
cron.schedule('0 12 * * *', async () => { // 12 UTC = 7 AM ET
  try {
    for (const days of [90, 60, 30] as const) {
      const batches = await getExpiryAlerts(days);
      if (batches.length === 0) continue;

      await notificationService.sendExpiryAlert({
        urgency: String(days) as '30' | '60' | '90',
        items: batches.map((b) => ({
          productName: b.productName,
          batchNumber: b.batchNumber,
          expiryDate: String(b.expiryDate),
          quantityOnHand: Number(b.quantityOnHand),
        })),
      });
    }
    console.log('[cron] Expiry alerts sent');
  } catch (err) {
    console.error('[cron] checkExpiryAlerts error:', err);
  }
});

// Daily at 7:30 AM ET — low stock alerts
cron.schedule('30 12 * * *', async () => { // 12:30 UTC = 7:30 AM ET
  try {
    const alerts = await getLowStockAlerts();
    if (alerts.length === 0) return;

    await notificationService.sendLowStockAlert({
      items: alerts.map((a) => ({
        productName: a.productName,
        currentStock: Number(a.totalOnHand),
        reorderPoint: Number(a.reorderPoint),
      })),
    });

    console.log(`[cron] Low stock alert sent for ${alerts.length} products`);
  } catch (err) {
    console.error('[cron] checkLowStockAlerts error:', err);
  }
});

// Daily at 8:00 AM ET — process due subscriptions (auto-refill)
cron.schedule('0 13 * * *', async () => { // 13 UTC = 8 AM ET
  try {
    const { getDueSubscriptions, recordSubscriptionOrder } = await import('./services/subscription.service');
    const dueSubs = await getDueSubscriptions();
    if (dueSubs.length === 0) return;

    for (const sub of dueSubs) {
      try {
        // Record subscription order as created — staff processes manually for now
        await recordSubscriptionOrder(sub.id, 'created', undefined);
        console.log(`[cron] Subscription ${sub.id} — order queued`);
      } catch (subErr) {
        await recordSubscriptionOrder(sub.id, 'failed', undefined, (subErr as Error).message);
        console.error(`[cron] Subscription ${sub.id} failed:`, (subErr as Error).message);
      }
    }
    console.log(`[cron] Processed ${dueSubs.length} due subscriptions`);
  } catch (err) {
    console.error('[cron] processSubscriptions error:', err);
  }
});

