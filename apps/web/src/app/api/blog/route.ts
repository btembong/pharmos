import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { blogPosts } from '@pharmaflow/db/schema';
import { and, eq, isNull, desc, like, or, sql } from 'drizzle-orm';
import { isAuthError, requireRole } from '@/lib/auth';
import { z } from 'zod';

// GET /api/blog — list published posts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '12'));
    const offset = (page - 1) * limit;

    const conditions: any[] = [
      eq(blogPosts.status, 'published'),
      isNull(blogPosts.deletedAt),
    ];
    if (category) conditions.push(eq(blogPosts.category, category));
    if (search) {
      conditions.push(
        or(like(blogPosts.title, `%${search}%`), like(blogPosts.excerpt, `%${search}%`))
      );
    }

    const [posts, [{ total }]] = await Promise.all([
      db
        .select({
          id: blogPosts.id,
          slug: blogPosts.slug,
          title: blogPosts.title,
          excerpt: blogPosts.excerpt,
          featuredImage: blogPosts.featuredImage,
          featuredImageAlt: blogPosts.featuredImageAlt,
          author: blogPosts.author,
          authorTitle: blogPosts.authorTitle,
          category: blogPosts.category,
          tags: blogPosts.tags,
          publishedAt: blogPosts.publishedAt,
          readingTimeMinutes: blogPosts.readingTimeMinutes,
        })
        .from(blogPosts)
        .where(and(...conditions))
        .orderBy(desc(blogPosts.publishedAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(blogPosts)
        .where(and(...conditions)),
    ]);

    return NextResponse.json({ data: posts, meta: { total, page, limit } });
  } catch (error) {
    console.error('Error listing blog posts:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const createPostSchema = z.object({
  slug: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
  excerpt: z.string().max(500).optional(),
  body: z.string().optional(),
  featuredImage: z.string().url().optional(),
  featuredImageAlt: z.string().max(255).optional(),
  author: z.string().max(100).optional(),
  authorTitle: z.string().max(100).optional(),
  category: z.string().max(50).optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['draft', 'published']).default('draft'),
  publishedAt: z.string().datetime().optional(),
  metaTitle: z.string().max(60).optional(),
  metaDescription: z.string().max(160).optional(),
  relatedProductSlugs: z.array(z.string()).optional(),
  readingTimeMinutes: z.string().max(5).optional(),
});

// POST /api/blog — create post (admin only)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole('super_admin');
    if (isAuthError(auth)) return auth;

    const body = await request.json();
    const parsed = createPostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 });
    }

    const data = parsed.data;
    const now = new Date();
    const publishedAt = data.status === 'published'
      ? data.publishedAt ? new Date(data.publishedAt) : now
      : null;

    const [post] = await db
      .insert(blogPosts)
      .values({ ...data, publishedAt, updatedAt: now })
      .returning();

    return NextResponse.json({ data: post }, { status: 201 });
  } catch (error) {
    console.error('Error creating blog post:', (error as Error).message);
    if ((error as any).code === '23505') {
      return NextResponse.json({ error: 'A post with this slug already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
