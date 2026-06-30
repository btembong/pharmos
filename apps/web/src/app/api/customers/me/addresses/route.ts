import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { customers, customerAddresses } from '@pharmaflow/db/schema';
import { eq } from 'drizzle-orm';

const addAddressSchema = z.object({
  label: z.string().max(100).optional(),
  recipientName: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  addressLine1: z.string().min(1).max(255),
  addressLine2: z.string().max(255).optional(),
  city: z.string().min(1).max(100),
  state: z.string().length(2),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/),
  isDefault: z.boolean().default(false),
});

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [customer] = await db.select({ id: customers.id }).from(customers)
      .where(eq(customers.clerkUserId, userId)).limit(1);

    if (!customer) return NextResponse.json({ data: [] });

    const addresses = await db.select().from(customerAddresses)
      .where(eq(customerAddresses.customerId, customer.id));

    return NextResponse.json({ data: addresses });
  } catch (error) {
    console.error('Error getting addresses:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = addAddressSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 });
    }

    const [customer] = await db.select({ id: customers.id }).from(customers)
      .where(eq(customers.clerkUserId, userId)).limit(1);

    if (!customer) return NextResponse.json({ error: 'Customer not found', code: 'NOT_FOUND' }, { status: 404 });

    const [address] = await db.insert(customerAddresses)
      .values({ ...parsed.data, customerId: customer.id, country: 'US' })
      .returning();

    return NextResponse.json({ data: address }, { status: 201 });
  } catch (error) {
    console.error('Error adding address:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
