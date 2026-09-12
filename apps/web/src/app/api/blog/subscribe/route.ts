import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { newsletterSubscribers } from '@pharmaflow/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const subscribeSchema = z.object({
  email: z.string().email().max(255),
  source: z.string().max(50).optional(),
});

// POST /api/blog/subscribe — newsletter signup
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = subscribeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const { email, source } = parsed.data;

    // Upsert — if already subscribed just return success silently
    const [existing] = await db
      .select({ id: newsletterSubscribers.id, status: newsletterSubscribers.status })
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.email, email.toLowerCase()))
      .limit(1);

    if (existing) {
      if (existing.status === 'unsubscribed') {
        // Re-subscribe
        await db
          .update(newsletterSubscribers)
          .set({ status: 'active', unsubscribedAt: null, source: source ?? 'blog' })
          .where(eq(newsletterSubscribers.id, existing.id));
      }
      return NextResponse.json({ data: { subscribed: true } });
    }

    await db.insert(newsletterSubscribers).values({
      email: email.toLowerCase(),
      source: source ?? 'blog',
      status: 'active',
    });

    return NextResponse.json({ data: { subscribed: true } }, { status: 201 });
  } catch (error) {
    console.error('Error subscribing:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
