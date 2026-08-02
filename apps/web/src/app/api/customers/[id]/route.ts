import { NextRequest, NextResponse } from 'next/server';
import { isAuthError, requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { customers } from '@pharmaflow/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole('super_admin', 'customer_support');
    if (isAuthError(auth)) return auth;

    const { id } = await params;
    const rows = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
    if (rows.length === 0) return NextResponse.json({ error: 'Customer not found', code: 'NOT_FOUND' }, { status: 404 });
    return NextResponse.json({ data: rows[0] });
  } catch (error) {
    console.error('Error getting customer:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
