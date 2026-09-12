import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { blogPosts } from '@pharmaflow/db/schema';
import { and, eq, isNull, isNotNull, sql } from 'drizzle-orm';

// GET /api/blog/categories — list distinct categories that have published posts
export async function GET() {
  try {
    const rows = await db
      .select({
        category: blogPosts.category,
        count: sql<number>`count(*)::int`,
      })
      .from(blogPosts)
      .where(
        and(
          eq(blogPosts.status, 'published'),
          isNull(blogPosts.deletedAt),
          isNotNull(blogPosts.category)
        )
      )
      .groupBy(blogPosts.category);

    const categories = rows
      .filter((r) => r.category)
      .map((r) => r.category as string);

    return NextResponse.json({ data: categories });
  } catch (error) {
    console.error('Error fetching blog categories:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
