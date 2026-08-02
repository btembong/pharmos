import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; action: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const customerId = await getCustomerId(userId);
    if (!customerId) return NextResponse.json({ error: 'Customer not found' }, { status: 400 });

    const { id, action } = await params;
    let sub;

    if (action === 'pause') {
      const body = await request.json().catch(() => ({}));
      const pauseDays = Number(body.pauseDays) || 30;
      sub = await subscriptionService.pauseSubscription(id, customerId, pauseDays);
    } else if (action === 'resume') {
      sub = await subscriptionService.resumeSubscription(id, customerId);
    } else if (action === 'cancel') {
      const body = await request.json().catch(() => ({}));
      sub = await subscriptionService.cancelSubscription(id, customerId, body.reason);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (!sub) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    return NextResponse.json({ data: sub });
  } catch (error) {
    console.error('Error with subscription action:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
