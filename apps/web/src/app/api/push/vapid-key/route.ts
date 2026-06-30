import { NextResponse } from 'next/server';
import { pushService } from '@/lib/services/push.service';

export async function GET() {
  const key = pushService.getVapidPublicKey();
  if (!key) {
    return NextResponse.json({ error: 'Push notifications not configured' }, { status: 503 });
  }
  return NextResponse.json({ data: { vapidPublicKey: key } });
}
