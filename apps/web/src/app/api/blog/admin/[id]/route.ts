import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { blogPosts } from '@pharmaflow/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { isAuthError, requireRole } from '@/lib/auth';

// GET /api/blog/admin/[id] — fetch single post by ID (admin, includes drafts)
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireRole('super_admin');
    if (isAuthError(auth)) return auth;

    const [post] = await db
      .select()
      .from(blogPosts)
      .where(and(eq(blogPosts.id, params.id), isNull(blogPosts.deletedAt)))
      .limit(1);

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json({ data: post });
  } catch (error) {
    console.error('Error fetching blog post by id:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
