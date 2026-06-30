import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import { isAuthError, requireAuth, requireRole } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit';
import { db } from '@/lib/db';
import { customers, customerAddresses } from '@pharmaflow/db/schema';
import { eq } from 'drizzle-orm';
import * as orderService from '@/lib/services/order.service';
import * as inventoryService from '@/lib/services/inventory.service';
import { notificationService } from '@/lib/services/notification.service';
import { pushService } from '@/lib/services/push.service';

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
  customerId: z.string().uuid().optional(),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().optional(),
  deliveryMethod: z.enum(['standard', 'express', 'pickup']).default('standard'),
  deliveryAddressId: z.string().uuid().optional(),
  shippingAddress: inlineAddressSchema.optional(),
  deliveryNotes: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    productName: z.string(),
    productSlug: z.string().optional(),
    quantity: z.number().int().positive(),
    unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
    totalPrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
  })).min(1),
  subtotal: z.string().regex(/^\d+(\.\d{1,2})?$/),
  deliveryFee: z.string().regex(/^\d+(\.\d{1,2})?$/).default('0'),
  taxAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).default('0'),
  totalAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
});

// GET /api/orders — list all orders (admin) or own orders (customer via ?my=true)
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());
    const parsed = listOrdersQuery.safeParse(query);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
    }

    const result = await orderService.listOrders(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error listing orders:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/orders — create order
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 });
    }

    const { items, shippingAddress, customerEmail, customerPhone, ...orderData } = parsed.data;

    // Resolve customerId
    let customerId: string | undefined = orderData.customerId;

    if (!customerId && userId) {
      const [existing] = await db.select({ id: customers.id }).from(customers)
        .where(eq(customers.clerkUserId, userId)).limit(1);

      if (existing) {
        customerId = existing.id;
      } else if (customerEmail) {
        const [byEmail] = await db.select({ id: customers.id }).from(customers)
          .where(eq(customers.email, customerEmail)).limit(1);

        if (byEmail) {
          customerId = byEmail.id;
          await db.update(customers)
            .set({ clerkUserId: userId, phone: customerPhone ?? undefined, updatedAt: new Date() })
            .where(eq(customers.id, byEmail.id));
        } else {
          const [created] = await db.insert(customers)
            .values({ clerkUserId: userId, email: customerEmail, phone: customerPhone })
            .returning({ id: customers.id });
          customerId = created.id;
        }
      }
    }

    if (!customerId) {
      return NextResponse.json({ error: 'Could not resolve customer', code: 'CUSTOMER_REQUIRED' }, { status: 400 });
    }

    // Resolve deliveryAddressId
    let deliveryAddressId: string | undefined = orderData.deliveryAddressId;

    if (!deliveryAddressId && shippingAddress) {
      const [addr] = await db.insert(customerAddresses).values({
        customerId,
        recipientName: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
        phone: shippingAddress.phone ?? undefined,
        addressLine1: shippingAddress.addressLine1,
        addressLine2: shippingAddress.addressLine2 ?? undefined,
        city: shippingAddress.city,
        state: shippingAddress.state,
        zipCode: shippingAddress.zipCode,
        country: 'US',
      }).returning({ id: customerAddresses.id });
      deliveryAddressId = addr.id;
    }

    const order = await orderService.createOrder(
      { ...orderData, customerId, deliveryAddressId } as any,
      items as any,
    );

    // FEFO stock reservation
    for (const item of items) {
      try {
        const allocations = await inventoryService.allocateBatchesForOrder(item.productId, item.quantity);
        for (const alloc of allocations) {
          await inventoryService.hardReserve(alloc.batchId, alloc.quantity, order.id);
        }
      } catch {
        console.warn(`[inventory] Could not reserve stock for product ${item.productId}`);
      }
    }

    await writeAuditLog({
      actorId: userId,
      actorType: 'customer',
      action: 'order.created',
      entityType: 'order',
      entityId: order.id,
      afterState: { orderNumber: order.orderNumber, total: order.totalAmount },
    });

    const contactName = shippingAddress
      ? `${shippingAddress.firstName} ${shippingAddress.lastName}`
      : (customerEmail ?? 'Customer');

    if (customerEmail) {
      notificationService.send('order.pending_payment', {
        customer: { email: customerEmail, phone: customerPhone, name: contactName },
        order: {
          orderNumber: order.orderNumber,
          total: Number(order.totalAmount),
          subtotal: Number(orderData.subtotal || order.totalAmount),
          deliveryFee: Number(orderData.deliveryFee || 0),
          taxAmount: Number(orderData.taxAmount || 0),
          deliveryMethod: orderData.deliveryMethod,
          orderDate: new Date().toISOString(),
          items: items.map((i) => ({
            productName: i.productName,
            quantity: i.quantity,
            unitPrice: Number(i.unitPrice),
            totalPrice: Number(i.totalPrice),
          })),
          deliveryAddress: shippingAddress ? {
            recipientName: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
            addressLine1: shippingAddress.addressLine1,
            addressLine2: shippingAddress.addressLine2,
            city: shippingAddress.city,
            state: shippingAddress.state,
            zipCode: shippingAddress.zipCode,
          } : null,
        },
      }).catch((err) => console.error('[notification] order.pending_payment failed:', err));
    }

    pushService.notifyNewOrder(order.orderNumber, order.totalAmount)
      .catch((err) => console.error('[push] notifyNewOrder failed:', err));

    return NextResponse.json({ data: order }, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
