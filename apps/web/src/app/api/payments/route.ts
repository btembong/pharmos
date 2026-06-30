import { NextRequest, NextResponse } from 'next/server';
import { isAuthError, requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { payments } from '@pharmaflow/db/schema';
import { desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole('super_admin', 'finance');
    if (isAuthError(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit')) || 50;
    const rows = await db.select().from(payments).orderBy(desc(payments.createdAt)).limit(limit);
    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error('Error listing payments:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
