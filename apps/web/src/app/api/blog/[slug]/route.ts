import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { blogPosts } from '@pharmaflow/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { isAuthError, requireRole } from '@/lib/auth';
import { z } from 'zod';

// GET /api/blog/[slug] — get single published post
export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const [post] = await db
      .select()
      .from(blogPosts)
      .where(
        and(
          eq(blogPosts.slug, params.slug),
          eq(blogPosts.status, 'published'),
          isNull(blogPosts.deletedAt)
        )
      )
      .limit(1);

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json({ data: post });
  } catch (error) {
    console.error('Error fetching blog post:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const updatePostSchema = z.object({
  slug: z.string().min(1).max(200).optional(),
  title: z.string().min(1).max(200).optional(),
  excerpt: z.string().max(500).optional(),
  body: z.string().optional(),
  featuredImage: z.string().url().optional().or(z.literal('')),
  featuredImageAlt: z.string().max(255).optional(),
  author: z.string().max(100).optional(),
  authorTitle: z.string().max(100).optional(),
  category: z.string().max(50).optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['draft', 'published']).optional(),
  publishedAt: z.string().datetime().optional(),
  metaTitle: z.string().max(60).optional(),
  metaDescription: z.string().max(160).optional(),
  relatedProductSlugs: z.array(z.string()).optional(),
  readingTimeMinutes: z.string().max(5).optional(),
});

// PUT /api/blog/[slug] — update post (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const auth = await requireRole('super_admin');
    if (isAuthError(auth)) return auth;

    const body = await request.json();
    const parsed = updatePostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 });
    }

    const data = parsed.data;
    const now = new Date();

    // If publishing and no publishedAt set yet, set it now
    let publishedAt: Date | null | undefined = undefined;
    if (data.status === 'published' && data.publishedAt) {
      publishedAt = new Date(data.publishedAt);
    } else if (data.status === 'published') {
      // Will keep existing publishedAt via partial update, but if it was draft before set now
      publishedAt = now;
    } else if (data.status === 'draft') {
      publishedAt = null;
    }

    const updateData: Record<string, unknown> = { ...data, updatedAt: now };
    if (publishedAt !== undefined) updateData.publishedAt = publishedAt;

    const [post] = await db
      .update(blogPosts)
      .set(updateData)
      .where(and(eq(blogPosts.slug, params.slug), isNull(blogPosts.deletedAt)))
      .returning();

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json({ data: post });
  } catch (error) {
    console.error('Error updating blog post:', (error as Error).message);
    if ((error as any).code === '23505') {
      return NextResponse.json({ error: 'A post with this slug already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/blog/[slug] — soft delete (admin only)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const auth = await requireRole('super_admin');
    if (isAuthError(auth)) return auth;

    const [post] = await db
      .update(blogPosts)
      .set({ deletedAt: new Date() })
      .where(and(eq(blogPosts.slug, params.slug), isNull(blogPosts.deletedAt)))
      .returning({ id: blogPosts.id });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error('Error deleting blog post:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
