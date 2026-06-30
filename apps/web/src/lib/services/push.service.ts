import webPush from 'web-push';
import { db } from '@pharmaflow/db';
import { pushSubscriptions } from '@pharmaflow/db/schema';
import { eq } from 'drizzle-orm';

// Configure VAPID keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:admin@pharmos.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export const pushService = {
  getVapidPublicKey() {
    return VAPID_PUBLIC_KEY;
  },

  async subscribe(clerkUserId: string, subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }, userAgent?: string) {
    // Upsert: delete existing with same endpoint, then insert
    await db.delete(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, subscription.endpoint));

    const [row] = await db.insert(pushSubscriptions).values({
      clerkUserId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent: userAgent || null,
    }).returning();

    return row;
  },

  async unsubscribe(endpoint: string) {
    await db.delete(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint));
  },

  async notifyAllStaff(payload: {
    title: string;
    body: string;
    url?: string;
    tag?: string;
  }) {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      console.log('[Push] VAPID keys not configured, skipping push notifications');
      return;
    }

    const subs = await db.select().from(pushSubscriptions);
    if (subs.length === 0) return;

    const data = JSON.stringify(payload);
    const results = await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webPush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            data
          );
        } catch (err: any) {
          // 410 Gone or 404 = subscription expired, remove it
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            await db.delete(pushSubscriptions)
              .where(eq(pushSubscriptions.id, sub.id));
          }
          throw err;
        }
      })
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    console.log(`[Push] Sent: ${sent}, Failed: ${failed}`);
  },

  async notifyNewOrder(orderNumber: string, total: string) {
    await this.notifyAllStaff({
      title: 'New Order',
      body: `${orderNumber} — $${Number(total).toFixed(2)}`,
      url: '/manager/orders?status=pending_payment',
      tag: `order-${orderNumber}`,
    });
  },

  async notifyPaymentProof(orderNumber: string) {
    await this.notifyAllStaff({
      title: 'Payment Proof Uploaded',
      body: `${orderNumber} — Customer submitted payment proof`,
      url: '/manager/orders?status=pending_payment',
      tag: `proof-${orderNumber}`,
    });
  },
};
