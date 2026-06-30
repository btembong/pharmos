import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { customers } from '@pharmaflow/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rows = await db.select().from(customers)
      .where(eq(customers.clerkUserId, userId)).limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Customer not found', code: 'NOT_FOUND' }, { status: 404 });
    }
    return NextResponse.json({ data: rows[0] });
  } catch (error) {
    console.error('Error getting customer profile:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { phone, dateOfBirth, marketingConsent } = await request.json();
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (phone !== undefined) updateData.phone = phone;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
    if (marketingConsent !== undefined) updateData.marketingConsent = marketingConsent;

    const [updated] = await db.update(customers).set(updateData)
      .where(eq(customers.clerkUserId, userId)).returning();

    if (!updated) return NextResponse.json({ error: 'Customer not found', code: 'NOT_FOUND' }, { status: 404 });
    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Error updating customer profile:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
