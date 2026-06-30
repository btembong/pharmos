import { NextRequest, NextResponse } from 'next/server';
import { getLowStockAlerts } from '@/lib/services/inventory.service';
import { notificationService } from '@/lib/services/notification.service';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const alerts = await getLowStockAlerts();
    if (alerts.length === 0) return NextResponse.json({ data: { ok: true, alerts: 0 } });

    await notificationService.sendLowStockAlert({
      items: alerts.map((a) => ({
        productName: a.productName,
        currentStock: Number(a.totalOnHand),
        reorderPoint: Number(a.reorderPoint),
      })),
    });

    console.log(`[cron] Low stock alert sent for ${alerts.length} products`);
    return NextResponse.json({ data: { ok: true, alerts: alerts.length } });
  } catch (err) {
    console.error('[cron] checkLowStockAlerts error:', err);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}
