import { NextResponse } from 'next/server';
import { isAuthError, requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { banners } from '@pharmaflow/db/schema';
import { isNull, asc } from 'drizzle-orm';

export async function GET() {
  try {
    const auth = await requireAuth();
    if (isAuthError(auth)) return auth;

    const results = await db.select().from(banners)
      .where(isNull(banners.deletedAt))
      .orderBy(asc(banners.sortOrder));

    return NextResponse.json({ data: results });
  } catch (error) {
    console.error('Error fetching all banners:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
