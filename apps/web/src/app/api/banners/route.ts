import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAuthError, requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { banners } from '@pharmaflow/db/schema';
import { eq, and, isNull, asc } from 'drizzle-orm';

const createBannerSchema = z.object({
  placement: z.string().max(50).default('homepage_hero'),
  title: z.string().min(1).max(255),
  highlight: z.string().max(255).optional(),
  description: z.string().optional(),
  badgeText: z.string().max(100).optional(),
  ctaLabel: z.string().max(100).optional(),
  ctaUrl: z.string().max(500).optional(),
  imageUrl: z.string().optional(),
  overlayOpacity: z.number().int().min(0).max(100).default(60),
  textColor: z.enum(['light', 'dark']).default('light'),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const placement = searchParams.get('placement') || 'homepage_hero';

    const results = await db.select().from(banners)
      .where(and(eq(banners.placement, placement), eq(banners.isActive, true), isNull(banners.deletedAt)))
      .orderBy(asc(banners.sortOrder));

    return NextResponse.json({ data: results });
  } catch (error) {
    console.error('Error fetching banners:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isAuthError(auth)) return auth;

    const body = await request.json();
    const parsed = createBannerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.errors }, { status: 400 });
    }

    const [banner] = await db.insert(banners).values(parsed.data).returning();
    return NextResponse.json({ data: banner }, { status: 201 });
  } catch (error) {
    console.error('Error creating banner:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
