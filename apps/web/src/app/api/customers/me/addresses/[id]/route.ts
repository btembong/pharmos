import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { customers, customerAddresses } from '@pharmaflow/db/schema';
import { eq, and } from 'drizzle-orm';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [customer] = await db.select({ id: customers.id }).from(customers)
      .where(eq(customers.clerkUserId, userId)).limit(1);
    if (!customer) return NextResponse.json({ error: 'Customer not found', code: 'NOT_FOUND' }, { status: 404 });

    const { id } = await params;
    const body = await request.json();

    if (body.isDefault) {
      await db.update(customerAddresses).set({ isDefault: false })
        .where(eq(customerAddresses.customerId, customer.id));
    }

    const [updated] = await db.update(customerAddresses).set(body)
      .where(and(eq(customerAddresses.id, id), eq(customerAddresses.customerId, customer.id)))
      .returning();

    if (!updated) return NextResponse.json({ error: 'Address not found', code: 'NOT_FOUND' }, { status: 404 });
    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Error updating address:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [customer] = await db.select({ id: customers.id }).from(customers)
      .where(eq(customers.clerkUserId, userId)).limit(1);
    if (!customer) return NextResponse.json({ error: 'Customer not found', code: 'NOT_FOUND' }, { status: 404 });

    const { id } = await params;
    const deleted = await db.delete(customerAddresses)
      .where(and(eq(customerAddresses.id, id), eq(customerAddresses.customerId, customer.id)))
      .returning();

    if (deleted.length === 0) return NextResponse.json({ error: 'Address not found', code: 'NOT_FOUND' }, { status: 404 });
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error('Error deleting address:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
