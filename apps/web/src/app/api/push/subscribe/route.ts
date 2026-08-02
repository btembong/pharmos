import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import { pushService } from '@/lib/services/push.service';

const subscribeSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string(),
      auth: z.string(),
    }),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = subscribeSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 });

    const result = await pushService.subscribe(
      userId,
      parsed.data.subscription,
      request.headers.get('user-agent') ?? undefined
    );

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('[Push] Subscribe error:', error);
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }
}
