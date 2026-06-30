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

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const customerId = await getCustomerId(userId);
    if (!customerId) return NextResponse.json({ data: [] });

    const subs = await subscriptionService.getCustomerSubscriptions(customerId);
    return NextResponse.json({ data: subs });
  } catch (error) {
    console.error('Error getting subscriptions:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
