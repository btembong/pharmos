import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAuthError, requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { paymentMethods } from '@pharmaflow/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function GET() {
  try {
    const methods = await db.select().from(paymentMethods)
      .where(eq(paymentMethods.isActive, true))
      .orderBy(asc(paymentMethods.sortOrder));
    return NextResponse.json({ data: methods });
  } catch (error) {
    console.error('Error listing payment methods:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const upsertSchema = z.object({
  method: z.enum(['zelle', 'venmo', 'cashapp', 'wire_transfer', 'check', 'cash']),
  label: z.string().min(1).max(100),
  details: z.string().min(1),
  instructions: z.string().optional(),
  icon: z.string().max(50).optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole('super_admin');
    if (isAuthError(auth)) return auth;

    const body = await request.json();
    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 });
    }

    const existing = await db.query.paymentMethods.findFirst({
      where: eq(paymentMethods.method, parsed.data.method),
    });

    if (existing) {
      const [updated] = await db.update(paymentMethods)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(paymentMethods.id, existing.id))
        .returning();
      return NextResponse.json({ data: updated });
    } else {
      const [created] = await db.insert(paymentMethods).values(parsed.data).returning();
      return NextResponse.json({ data: created }, { status: 201 });
    }
  } catch (error) {
    console.error('Error saving payment method:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
