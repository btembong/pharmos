import { Router } from 'express';
import { Webhook } from 'svix';
import { upsertCustomerFromClerk } from './customers';
import { db } from '../lib/db';
import { customers } from '@pharmaflow/db';
import { eq } from 'drizzle-orm';

const router: Router = Router();

interface ClerkEmailAddress {
  email_address: string;
  id: string;
}

interface ClerkUserPayload {
  id: string;
  email_addresses: ClerkEmailAddress[];
  primary_email_address_id: string;
  first_name: string | null;
  last_name: string | null;
  phone_numbers: { phone_number: string }[];
}

// POST /api/webhooks/clerk — Clerk user lifecycle events
// Requires raw body — mount with express.raw() before this route
router.post('/clerk', async (req, res) => {
  const secret = process.env.CLERK_WEBHOOK_SECRET;

  if (!secret) {
    console.warn('[webhook] CLERK_WEBHOOK_SECRET not set — skipping verification');
    res.status(200).json({ received: true });
    return;
  }

  const svixId = req.headers['svix-id'] as string;
  const svixTimestamp = req.headers['svix-timestamp'] as string;
  const svixSignature = req.headers['svix-signature'] as string;

  if (!svixId || !svixTimestamp || !svixSignature) {
    res.status(400).json({ error: 'Missing svix headers' });
    return;
  }

  let event: { type: string; data: ClerkUserPayload };

  try {
    const wh = new Webhook(secret);
    const payload = req.body instanceof Buffer ? req.body.toString('utf8') : JSON.stringify(req.body);
    event = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as { type: string; data: ClerkUserPayload };
  } catch (err) {
    console.error('[webhook] Clerk signature verification failed:', (err as Error).message);
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }

  try {
    const { type, data } = event;

    if (type === 'user.created' || type === 'user.updated') {
      const primaryEmail = data.email_addresses.find(
        (e) => e.id === data.primary_email_address_id
      );
      if (!primaryEmail) {
        res.status(200).json({ received: true });
        return;
      }
      await upsertCustomerFromClerk({
        clerkUserId: data.id,
        email: primaryEmail.email_address,
        firstName: data.first_name ?? undefined,
        lastName: data.last_name ?? undefined,
        phone: data.phone_numbers?.[0]?.phone_number ?? undefined,
      });
    }

    if (type === 'user.deleted') {
      await db
        .update(customers)
        .set({ deletedAt: new Date(), isActive: false })
        .where(eq(customers.clerkUserId, data.id));
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('[webhook] Error processing Clerk event:', (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
