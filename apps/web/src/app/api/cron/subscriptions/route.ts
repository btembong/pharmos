import { NextRequest, NextResponse } from 'next/server';
import { getDueSubscriptions, recordSubscriptionOrder } from '@/lib/services/subscription.service';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const dueSubs = await getDueSubscriptions();
    if (dueSubs.length === 0) return NextResponse.json({ data: { processed: 0 } });

    for (const sub of dueSubs) {
      try {
        await recordSubscriptionOrder(sub.id, 'created', undefined);
        console.log(`[cron] Subscription ${sub.id} — order queued`);
      } catch (subErr) {
        await recordSubscriptionOrder(sub.id, 'failed', undefined, (subErr as Error).message);
        console.error(`[cron] Subscription ${sub.id} failed:`, (subErr as Error).message);
      }
    }

    console.log(`[cron] Processed ${dueSubs.length} due subscriptions`);
    return NextResponse.json({ data: { processed: dueSubs.length } });
  } catch (err) {
    console.error('[cron] processSubscriptions error:', err);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}
