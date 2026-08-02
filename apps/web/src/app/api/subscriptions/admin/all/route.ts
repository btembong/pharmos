import { NextRequest, NextResponse } from 'next/server';
import { requireRole, isAuthError } from '@/lib/auth';
import * as subscriptionService from '@/lib/services/subscription.service';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRole('super_admin');
    if (isAuthError(authResult)) return authResult;

    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;
    const result = await subscriptionService.listAllSubscriptions(page, limit);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error listing subscriptions:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
