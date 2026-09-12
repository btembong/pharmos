import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { blogPosts } from '@pharmaflow/db/schema';
import { and, isNull, desc, eq, sql } from 'drizzle-orm';
import { isAuthError, requireRole } from '@/lib/auth';

// GET /api/blog/admin/all — list all posts (admin only), includes drafts
export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole('super_admin');
    if (isAuthError(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'draft' | 'published' | null (all)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '20'));
    const offset = (page - 1) * limit;

    const conditions: any[] = [isNull(blogPosts.deletedAt)];
    if (status === 'draft' || status === 'published') {
      conditions.push(eq(blogPosts.status, status));
    }

    const [posts, [{ total }]] = await Promise.all([
      db
        .select({
          id: blogPosts.id,
          slug: blogPosts.slug,
          title: blogPosts.title,
          status: blogPosts.status,
          category: blogPosts.category,
          author: blogPosts.author,
          publishedAt: blogPosts.publishedAt,
          createdAt: blogPosts.createdAt,
          updatedAt: blogPosts.updatedAt,
          readingTimeMinutes: blogPosts.readingTimeMinutes,
        })
        .from(blogPosts)
        .where(and(...conditions))
        .orderBy(desc(blogPosts.updatedAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(blogPosts)
        .where(and(...conditions)),
    ]);

    return NextResponse.json({ data: posts, meta: { total, page, limit } });
  } catch (error) {
    console.error('Error listing all blog posts:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
