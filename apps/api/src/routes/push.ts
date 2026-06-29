import { Router } from 'express';
import { requireAuth } from '@clerk/express';
import { getAuth } from '@clerk/express';
import { pushService } from '../services/push.service';
import { z } from 'zod';

const router = Router();

// GET /api/push/vapid-key — public key for client-side subscription
router.get('/vapid-key', (_req, res) => {
  const key = pushService.getVapidPublicKey();
  if (!key) {
    return res.status(503).json({ error: 'Push notifications not configured' });
  }
  res.json({ data: { vapidPublicKey: key } });
});

const subscribeSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string(),
      auth: z.string(),
    }),
  }),
});

// POST /api/push/subscribe — register push subscription
router.post('/subscribe', requireAuth(), async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const parsed = subscribeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid subscription data' });
    }

    const result = await pushService.subscribe(
      auth.userId,
      parsed.data.subscription,
      req.headers['user-agent']
    );

    res.json({ data: result });
  } catch (error) {
    console.error('[Push] Subscribe error:', error);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

// POST /api/push/unsubscribe — remove push subscription
router.post('/unsubscribe', requireAuth(), async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint required' });
    }

    await pushService.unsubscribe(endpoint);
    res.json({ data: { success: true } });
  } catch (error) {
    console.error('[Push] Unsubscribe error:', error);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

export default router;
