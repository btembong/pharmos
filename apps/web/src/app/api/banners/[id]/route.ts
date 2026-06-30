import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAuthError, requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { banners } from '@pharmaflow/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

const updateBannerSchema = z.object({
  placement: z.string().max(50).optional(),
  title: z.string().min(1).max(255).optional(),
  highlight: z.string().max(255).optional(),
  description: z.string().optional(),
  badgeText: z.string().max(100).optional(),
  ctaLabel: z.string().max(100).optional(),
  ctaUrl: z.string().max(500).optional(),
  imageUrl: z.string().optional(),
  overlayOpacity: z.number().int().min(0).max(100).optional(),
  textColor: z.enum(['light', 'dark']).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (isAuthError(auth)) return auth;

    const { id } = await params;
    const body = await request.json();
    const parsed = updateBannerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.errors }, { status: 400 });
    }

    const [updated] = await db.update(banners)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(banners.id, id), isNull(banners.deletedAt)))
      .returning();

    if (!updated) return NextResponse.json({ error: 'Banner not found' }, { status: 404 });
    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Error updating banner:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (isAuthError(auth)) return auth;

    const { id } = await params;
    const [deleted] = await db.update(banners)
      .set({ deletedAt: new Date() })
      .where(and(eq(banners.id, id), isNull(banners.deletedAt)))
      .returning();

    if (!deleted) return NextResponse.json({ error: 'Banner not found' }, { status: 404 });
    return NextResponse.json({ data: { message: 'Banner deleted' } });
  } catch (error) {
    console.error('Error deleting banner:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
