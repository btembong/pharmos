import { NextRequest, NextResponse } from 'next/server';
import { isAuthError, requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { customers } from '@pharmaflow/db/schema';
import { isNull, desc, eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole('super_admin', 'customer_support');
    if (isAuthError(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit')) || 50;
    const rows = await db.select().from(customers)
      .where(isNull(customers.deletedAt))
      .orderBy(desc(customers.createdAt))
      .limit(limit);

    return NextResponse.json({ data: rows, meta: { total: rows.length } });
  } catch (error) {
    console.error('Error listing customers:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
