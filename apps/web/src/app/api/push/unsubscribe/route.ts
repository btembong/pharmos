import { NextRequest, NextResponse } from 'next/server';
import { pushService } from '@/lib/services/push.service';

export async function POST(request: NextRequest) {
  try {
    const { endpoint } = await request.json();
    if (!endpoint) return NextResponse.json({ error: 'Endpoint required' }, { status: 400 });

    await pushService.unsubscribe(endpoint);
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error('[Push] Unsubscribe error:', error);
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
  }
}
