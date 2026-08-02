import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAuthError, requireRole } from '@/lib/auth';
import * as taxService from '@/lib/services/tax.service';

export async function GET() {
  try {
    const auth = await requireRole('super_admin', 'finance');
    if (isAuthError(auth)) return auth;

    const rates = await taxService.listTaxRates();
    return NextResponse.json({ data: rates });
  } catch (error) {
    console.error('Error listing tax rates:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const upsertSchema = z.object({
  state: z.string().length(2),
  productType: z.string().min(1).max(30),
  rate: z.number().min(0).max(1),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole('super_admin', 'finance');
    if (isAuthError(auth)) return auth;

    const body = await request.json();
    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 });
    }

    const result = await taxService.upsertTaxRate(parsed.data.state, parsed.data.productType, parsed.data.rate);
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Error upserting tax rate:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
