import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { customers } from '@pharmaflow/db/schema';
import { eq } from 'drizzle-orm';
import * as subscriptionService from '@/lib/services/subscription.service';

async function getCustomerId(clerkUserId: string): Promise<string | null> {
  const customer = await db.query.customers.findFirst({
    where: eq(customers.clerkUserId, clerkUserId),
    columns: { id: true },
  });
  return customer?.id ?? null;
}

const createSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive().default(1),
  frequencyDays: z.number().int().min(7).max(365),
  deliveryAddressId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const customerId = await getCustomerId(userId);
    if (!customerId) return NextResponse.json({ error: 'Customer profile not found' }, { status: 400 });

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 });
    }

    const sub = await subscriptionService.createSubscription({ ...parsed.data, customerId });
    return NextResponse.json({ data: sub }, { status: 201 });
  } catch (error) {
    console.error('Error creating subscription:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
