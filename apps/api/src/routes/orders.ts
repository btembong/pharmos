import { Router, type Request } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate, validateQuery } from '../middleware/validate';
import { writeAuditLog } from '../lib/audit';
import { getAuth } from '@clerk/express';
import * as orderService from '../services/order.service';
import * as inventoryService from '../services/inventory.service';
import { notificationService } from '../services/notification.service';
import type { OrderStatus } from '@pharmaflow/types';
import { db } from '../lib/db';
import { customers, customerAddresses, orders, payments } from '@pharmaflow/db/schema';
import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import path from 'path';

// Multer for payment proof upload
const proofUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only images and PDF files are allowed'));
    }
  },
});

const router: Router = Router();

function param(req: Request, name: string): string {
  return req.params[name] as string;
}

// --- Schemas ---

const listOrdersQuery = z.object({
  status: z.string().optional(),
  customerId: z.string().uuid().optional(),
  paymentStatus: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const inlineAddressSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().length(2),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/),
  phone: z.string().optional(),
});

const createOrderSchema = z.object({
  // customerId is optional — resolved from Clerk token server-side
  customerId: z.string().uuid().optional(),
  // For B2C checkout: supply email/phone to upsert a customer record
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().optional(),
  // Delivery
  deliveryMethod: z.enum(['standard', 'express', 'pickup']).default('standard'),
  deliveryAddressId: z.string().uuid().optional(),
  shippingAddress: inlineAddressSchema.optional(), // inline address for B2C checkout
  deliveryNotes: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      productName: z.string(),
      productSlug: z.string().optional(),
      quantity: z.number().int().positive(),
      unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
      totalPrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
    })
  ).min(1),
  subtotal: z.string().regex(/^\d+(\.\d{1,2})?$/),
  deliveryFee: z.string().regex(/^\d+(\.\d{1,2})?$/).default('0'),
  taxAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).default('0'),
  totalAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
});

const updateStatusSchema = z.object({
  status: z.enum([
    'confirmed',
    'processing',
    'packed',
    'dispatched',
    'out_for_delivery',
    'delivered',
    'cancelled',
  ]),
  note: z.string().optional(),
  trackingNumber: z.string().optional(),
  courierName: z.string().optional(),
});

const confirmPaymentSchema = z.object({
  paymentMethod: z.enum(['zelle', 'venmo', 'cashapp', 'wire_transfer', 'check', 'cash']),
  providerRef: z.string().min(1),
  notes: z.string().optional(),
});

// --- Public routes ---

// GET /api/orders/track/:orderNumber — public tracking
router.get('/track/:orderNumber', async (req, res) => {
  try {
    const order = await orderService.getOrderByNumber(param(req, 'orderNumber'));
    if (!order) {
      res.status(404).json({ error: 'Order not found', code: 'NOT_FOUND' });
      return;
    }
    const tracking = await orderService.getOrderTracking(order.id);
    res.json({ data: tracking });
  } catch (error) {
    console.error('Error getting tracking:', (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/orders/track/:orderNumber/claim-paid — customer marks "I have paid" + optional proof upload
router.post('/track/:orderNumber/claim-paid', (req, res, next) => {
  proofUpload.single('proof')(req, res, (err) => {
    if (err) {
      res.status(400).json({ error: err.message || 'Upload error' });
      return;
    }
    next();
  });
}, async (req, res) => {
  try {
    const order = await orderService.getOrderByNumber(param(req, 'orderNumber'));
    if (!order) {
      res.status(404).json({ error: 'Order not found', code: 'NOT_FOUND' });
      return;
    }
    if (order.status !== 'pending_payment') {
      res.status(400).json({ error: 'Payment already confirmed or order is not awaiting payment', code: 'INVALID_STATUS' });
      return;
    }

    let proofUrl: string | null = null;

    // Upload proof file to R2 if provided
    if (req.file) {
      const accountId = process.env.R2_ACCOUNT_ID;
      const accessKeyId = process.env.R2_ACCESS_KEY_ID;
      const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
      const bucket = process.env.R2_BUCKET_PRODUCTS;
      const publicUrl = process.env.R2_PUBLIC_URL;

      if (accountId && accessKeyId && secretAccessKey && bucket) {
        const client = new S3Client({
          region: 'auto',
          endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
          credentials: { accessKeyId, secretAccessKey },
        });

        const ext = path.extname(req.file.originalname) || '.jpg';
        const hash = crypto.randomBytes(8).toString('hex');
        const key = `payment-proofs/${order.orderNumber}/${Date.now()}-${hash}${ext}`;

        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
          })
        );

        proofUrl = publicUrl ? `${publicUrl}/${key}` : `https://${bucket}.r2.dev/${key}`;
      }
    }

    // Update order with claim timestamp
    await db.update(orders).set({ paymentClaimedAt: new Date(), updatedAt: new Date() }).where(eq(orders.id, order.id));

    // If proof was uploaded, store it on the payment record
    if (proofUrl) {
      await db.update(payments)
        .set({ proofUrl, updatedAt: new Date() })
        .where(eq(payments.orderId, order.id));
    }

    // Audit log
    await writeAuditLog({
      entityType: 'order',
      entityId: order.id,
      action: 'payment_claimed',
      newValues: { proofUrl, claimedAt: new Date().toISOString() },
    });

    // Push notification to staff about proof upload
    if (proofUrl) {
      import('../services/push.service').then(({ pushService }) => {
        pushService.notifyPaymentProof(order.orderNumber)
          .catch((err) => console.error('[push] notifyPaymentProof failed:', err));
      });
    }

    res.json({ data: { success: true, proofUrl, message: 'Thank you! Our team will verify your payment shortly.' } });
  } catch (error) {
    console.error('Error claiming payment:', (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Customer routes ---

// POST /api/orders — create order (authenticated B2C customer)
router.post('/', requireAuth, validate(createOrderSchema), async (req, res) => {
  try {
    const auth = getAuth(req);
    const { items, shippingAddress, customerEmail, customerPhone, ...orderData } = req.body;

    // --- Resolve customerId ---
    let customerId: string | undefined = orderData.customerId;

    if (!customerId && auth?.userId) {
      // Look up existing customer by Clerk userId
      const [existing] = await db
        .select({ id: customers.id })
        .from(customers)
        .where(eq(customers.clerkUserId, auth.userId))
        .limit(1);

      if (existing) {
        customerId = existing.id;
      } else if (customerEmail) {
        // Upsert customer by email (first time placing an order)
        const [byEmail] = await db
          .select({ id: customers.id })
          .from(customers)
          .where(eq(customers.email, customerEmail))
          .limit(1);

        if (byEmail) {
          customerId = byEmail.id;
          // Attach Clerk userId to the existing record
          await db
            .update(customers)
            .set({ clerkUserId: auth.userId, phone: customerPhone ?? undefined, updatedAt: new Date() })
            .where(eq(customers.id, byEmail.id));
        } else {
          const [created] = await db
            .insert(customers)
            .values({ clerkUserId: auth.userId, email: customerEmail, phone: customerPhone })
            .returning({ id: customers.id });
          customerId = created.id;
        }
      }
    }

    if (!customerId) {
      res.status(400).json({ error: 'Could not resolve customer', code: 'CUSTOMER_REQUIRED' });
      return;
    }

    // --- Resolve deliveryAddressId ---
    let deliveryAddressId: string | undefined = orderData.deliveryAddressId;

    if (!deliveryAddressId && shippingAddress) {
      const [addr] = await db
        .insert(customerAddresses)
        .values({
          customerId,
          recipientName: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
          phone: shippingAddress.phone ?? undefined,
          addressLine1: shippingAddress.addressLine1,
          addressLine2: shippingAddress.addressLine2 ?? undefined,
          city: shippingAddress.city,
          state: shippingAddress.state,
          zipCode: shippingAddress.zipCode,
          country: 'US',
        })
        .returning({ id: customerAddresses.id });
      deliveryAddressId = addr.id;
    }

    const order = await orderService.createOrder(
      { ...orderData, customerId, deliveryAddressId },
      items,
    );

    // FEFO: hard-reserve stock for each item
    for (const item of items) {
      try {
        const allocations = await inventoryService.allocateBatchesForOrder(item.productId, item.quantity);
        // Record hard reservations per batch
        for (const alloc of allocations) {
          await inventoryService.hardReserve(alloc.batchId, alloc.quantity, order.id);
        }
      } catch {
        // Insufficient stock — proceed anyway (staff will catch during packing)
        console.warn(`[inventory] Could not reserve stock for product ${item.productId}`);
      }
    }

    await writeAuditLog({
      actorId: auth?.userId ?? undefined,
      actorType: 'customer',
      action: 'order.created',
      entityType: 'order',
      entityId: order.id,
      afterState: { orderNumber: order.orderNumber, total: order.totalAmount },
    });

    // Send pending payment notification
    const contactEmail = customerEmail;
    const contactName = shippingAddress
      ? `${shippingAddress.firstName} ${shippingAddress.lastName}`
      : (customerEmail ?? 'Customer');
    if (contactEmail) {
      notificationService.send('order.pending_payment', {
        customer: { email: contactEmail, phone: customerPhone, name: contactName },
        order: { orderNumber: order.orderNumber, total: Number(order.totalAmount) },
      }).catch((err) => console.error('[notification] order.pending_payment failed:', err));
    }

    // Push notification to staff
    import('../services/push.service').then(({ pushService }) => {
      pushService.notifyNewOrder(order.orderNumber, order.totalAmount)
        .catch((err) => console.error('[push] notifyNewOrder failed:', err));
    });

    res.status(201).json({ data: order });
  } catch (error) {
    console.error('Error creating order:', (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/orders/my — customer's own orders (resolved from Clerk JWT)
router.get('/my', requireAuth, async (req, res) => {
  try {
    const auth = getAuth(req);

    if (!auth?.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Resolve internal customerId from Clerk userId
    const [customer] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.clerkUserId, auth.userId))
      .limit(1);

    if (!customer) {
      // Customer record not yet created (no orders placed yet)
      res.json({ data: [], meta: { total: 0, page: 1, limit: 20, pages: 0 } });
      return;
    }

    const result = await orderService.listOrders({
      customerId: customer.id,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
    });
    res.json(result);
  } catch (error) {
    console.error('Error listing orders:', (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Admin routes ---

// GET /api/orders — list all orders (admin)
router.get(
  '/',
  requireAuth,
  requireRole('super_admin', 'finance', 'customer_support', 'pharmacist'),
  validateQuery(listOrdersQuery),
  async (req, res) => {
    try {
      const result = await orderService.listOrders(req.query as any);
      res.json(result);
    } catch (error) {
      console.error('Error listing orders:', (error as Error).message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/orders/:id — get order detail
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const order = await orderService.getOrderById(param(req, 'id'));
    if (!order) {
      res.status(404).json({ error: 'Order not found', code: 'NOT_FOUND' });
      return;
    }
    res.json({ data: order });
  } catch (error) {
    console.error('Error getting order:', (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/orders/:id/status — update order status (admin)
router.put(
  '/:id/status',
  requireAuth,
  requireRole('super_admin', 'inventory_manager', 'pharmacist'),
  validate(updateStatusSchema),
  async (req, res) => {
    try {
      const auth = getAuth(req);
      const { status, note, trackingNumber, courierName } = req.body;

      const order = await orderService.updateOrderStatus(
        param(req, 'id'),
        status as OrderStatus,
        auth?.userId ?? undefined,
        note,
        { trackingNumber, courierName }
      );

      await writeAuditLog({
        actorId: auth?.userId ?? undefined,
        actorType: 'staff',
        action: 'order.status_changed',
        entityType: 'order',
        entityId: param(req, 'id'),
        afterState: { status, trackingNumber, courierName },
      });

      res.json({ data: order });
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'ORDER_NOT_FOUND') {
        res.status(404).json({ error: 'Order not found', code: 'NOT_FOUND' });
        return;
      }
      if (msg.startsWith('INVALID_TRANSITION')) {
        res.status(400).json({ error: msg, code: 'INVALID_TRANSITION' });
        return;
      }
      console.error('Error updating status:', msg);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/orders/:id/confirm-payment — confirm manual payment (admin)
router.post(
  '/:id/confirm-payment',
  requireAuth,
  requireRole('super_admin', 'finance'),
  validate(confirmPaymentSchema),
  async (req, res) => {
    try {
      const auth = getAuth(req);
      const payment = await orderService.confirmPayment(
        param(req, 'id'),
        req.body.paymentMethod,
        req.body.providerRef,
        auth?.userId ?? 'unknown',
        req.body.notes
      );

      await writeAuditLog({
        actorId: auth?.userId ?? undefined,
        actorType: 'staff',
        action: 'payment.confirmed',
        entityType: 'payment',
        entityId: payment.id,
        afterState: payment,
      });

      res.json({ data: payment });
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'ORDER_NOT_FOUND') {
        res.status(404).json({ error: 'Order not found', code: 'NOT_FOUND' });
        return;
      }
      if (msg === 'ORDER_NOT_PENDING_PAYMENT') {
        res.status(400).json({ error: 'Order is not pending payment', code: msg });
        return;
      }
      console.error('Error confirming payment:', msg);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/orders/:id/tracking — get tracking info
router.get('/:id/tracking', async (req, res) => {
  try {
    const tracking = await orderService.getOrderTracking(param(req, 'id'));
    if (!tracking) {
      res.status(404).json({ error: 'Order not found', code: 'NOT_FOUND' });
      return;
    }
    res.json({ data: tracking });
  } catch (error) {
    console.error('Error getting tracking:', (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
