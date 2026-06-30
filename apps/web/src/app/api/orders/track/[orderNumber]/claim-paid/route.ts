import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, payments } from '@pharmaflow/db/schema';
import { eq } from 'drizzle-orm';
import { writeAuditLog } from '@/lib/audit';
import { pushService } from '@/lib/services/push.service';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as orderService from '@/lib/services/order.service';
import crypto from 'crypto';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'application/pdf'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await params;
    const order = await orderService.getOrderByNumber(orderNumber);
    if (!order) {
      return NextResponse.json({ error: 'Order not found', code: 'NOT_FOUND' }, { status: 404 });
    }
    if (order.status !== 'pending_payment') {
      return NextResponse.json({ error: 'Payment already confirmed or order is not awaiting payment', code: 'INVALID_STATUS' }, { status: 400 });
    }

    let proofUrl: string | null = null;

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('proof') as File | null;

      if (file && ALLOWED_TYPES.includes(file.type) && file.size <= MAX_SIZE) {
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

          const ext = file.name.split('.').pop() || 'jpg';
          const hash = crypto.randomBytes(8).toString('hex');
          const key = `payment-proofs/${order.orderNumber}/${Date.now()}-${hash}.${ext}`;
          const buffer = Buffer.from(await file.arrayBuffer());

          await client.send(new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: buffer,
            ContentType: file.type,
          }));

          proofUrl = publicUrl ? `${publicUrl}/${key}` : `https://${bucket}.r2.dev/${key}`;
        }
      }
    }

    await db.update(orders).set({ paymentClaimedAt: new Date(), updatedAt: new Date() }).where(eq(orders.id, order.id));

    if (proofUrl) {
      await db.update(payments).set({ proofUrl } as any).where(eq(payments.orderId, order.id));
    }

    await writeAuditLog({
      entityType: 'order',
      entityId: order.id,
      actorType: 'customer',
      action: 'payment_claimed',
      afterState: { proofUrl, claimedAt: new Date().toISOString() },
    });

    if (proofUrl) {
      pushService.notifyPaymentProof(order.orderNumber)
        .catch((err) => console.error('[push] notifyPaymentProof failed:', err));
    }

    return NextResponse.json({ data: { success: true, proofUrl, message: 'Thank you! Our team will verify your payment shortly.' } });
  } catch (error) {
    console.error('Error claiming payment:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
