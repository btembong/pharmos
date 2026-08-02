import { NextRequest, NextResponse } from 'next/server';
import * as tranzak from '@/lib/services/tranzak.service';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params;
    const status = await tranzak.getPaymentStatus(requestId);
    return NextResponse.json({ data: status });
  } catch (error) {
    console.error('TranZak status error:', (error as Error).message);
    return NextResponse.json({ error: 'Failed to get payment status' }, { status: 500 });
  }
}
