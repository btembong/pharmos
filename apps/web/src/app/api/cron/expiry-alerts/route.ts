import { NextRequest, NextResponse } from 'next/server';
import { getExpiryAlerts } from '@/lib/services/inventory.service';
import { notificationService } from '@/lib/services/notification.service';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    for (const days of [90, 60, 30] as const) {
      const batches = await getExpiryAlerts(days);
      if (batches.length === 0) continue;

      await notificationService.sendExpiryAlert({
        urgency: String(days) as '30' | '60' | '90',
        items: batches.map((b) => ({
          productName: b.productName,
          batchNumber: b.batchNumber,
          expiryDate: String(b.expiryDate),
          quantityOnHand: Number(b.quantityOnHand),
        })),
      });
    }
    console.log('[cron] Expiry alerts sent');
    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    console.error('[cron] checkExpiryAlerts error:', err);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}
