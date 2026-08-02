import { NextResponse } from 'next/server';
import { isAuthError, requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    const auth = await requireRole('super_admin', 'finance');
    if (isAuthError(auth)) return auth;

    const rows = await db.execute(sql`
      SELECT
        confirmed_at::date AS date,
        COUNT(*) AS payment_count,
        SUM(amount) AS total
      FROM payments
      WHERE confirmed_at IS NOT NULL
        AND confirmed_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY confirmed_at::date
      ORDER BY date DESC
    `);

    return NextResponse.json({ data: rows.rows });
  } catch (error) {
    console.error('Error generating revenue report:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
