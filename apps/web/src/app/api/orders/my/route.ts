import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { customers } from '@pharmaflow/db/schema';
import { eq } from 'drizzle-orm';
import * as orderService from '@/lib/services/order.service';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [customer] = await db.select({ id: customers.id }).from(customers)
      .where(eq(customers.clerkUserId, userId)).limit(1);

    if (!customer) {
      return NextResponse.json({ data: [], meta: { total: 0, page: 1, limit: 20, pages: 0 } });
    }

    const { searchParams } = new URL(request.url);
    const result = await orderService.listOrders({
      customerId: customer.id,
      page: Number(searchParams.get('page')) || 1,
      limit: Number(searchParams.get('limit')) || 20,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error listing orders:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
