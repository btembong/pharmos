import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAuth, requireRole } from '../middleware/auth';
import * as aiService from '../services/ai.service';
import * as orderService from '../services/order.service';
import { writeAuditLog } from '../lib/audit';

const router = Router();

// POST /api/ai/interaction-check — Layer 2 AI drug interaction check (public)
const interactionSchema = z.object({
  drugA: z.string().min(1),
  drugB: z.string().min(1),
});

router.post('/interaction-check', validate(interactionSchema), async (req, res) => {
  try {
    const result = await aiService.aiInteractionCheck(req.body.drugA, req.body.drugB);
    res.json({ data: result });
  } catch (error) {
    console.error('AI interaction check error:', (error as Error).message);
    res.status(500).json({ error: 'AI interaction check unavailable' });
  }
});

// POST /api/ai/chat — pharmacy chatbot (public)
const chatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1),
  })).min(1),
  context: z.object({
    cartItems: z.array(z.string()).optional(),
    currentPage: z.string().optional(),
  }).optional(),
});

router.post('/chat', validate(chatSchema), async (req, res) => {
  try {
    const result = await aiService.chatWithPharmacist(req.body.messages, req.body.context);
    res.json({ data: result });
  } catch (error) {
    console.error('AI chat error:', (error as Error).message);
    res.status(500).json({ error: 'Chat service unavailable' });
  }
});

// GET /api/ai/recommendations/:productId — frequently bought together (public)
router.get('/recommendations/:productId', async (req, res) => {
  try {
    const result = await aiService.getFrequentlyBoughtTogether(req.params.productId);
    res.json({ data: result });
  } catch (error) {
    console.error('Recommendations error:', (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/ai/forecast/:productId — demand forecast (admin)
router.get(
  '/forecast/:productId',
  requireAuth,
  requireRole('super_admin', 'inventory_manager'),
  async (req, res) => {
    try {
      const result = await aiService.getDemandForecast(req.params.productId);
      res.json({ data: result });
    } catch (error) {
      console.error('Forecast error:', (error as Error).message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/ai/feedback — thumbs up/down on a response
const feedbackSchema = z.object({
  messageContent: z.string().min(1),
  rating: z.enum(['up', 'down']),
  userMessage: z.string().optional(),
});

router.post('/feedback', validate(feedbackSchema), async (req, res) => {
  try {
    await writeAuditLog({
      actorType: 'customer',
      action: 'ai.chat_feedback',
      entityType: 'ai_chat',
      afterState: {
        rating: req.body.rating,
        aiMessage: req.body.messageContent.substring(0, 500),
        userMessage: req.body.userMessage?.substring(0, 500),
      },
    });
    res.json({ data: { success: true } });
  } catch (error) {
    console.error('Feedback error:', (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/ai/track/:orderNumber — order tracking for chatbot
router.get('/track/:orderNumber', async (req, res) => {
  try {
    const order = await orderService.getOrderByNumber(req.params.orderNumber);
    if (!order) {
      res.json({ data: null });
      return;
    }
    const tracking = await orderService.getOrderTracking(order.id);
    res.json({ data: tracking });
  } catch (error) {
    console.error('Chat tracking error:', (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
