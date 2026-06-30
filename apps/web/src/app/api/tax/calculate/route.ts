import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as taxService from '@/lib/services/tax.service';

const calculateSchema = z.object({
  state: z.string().length(2),
  items: z.array(z.object({
    price: z.number().positive(),
    quantity: z.number().int().positive(),
    categorySlug: z.string().nullable(),
  })),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = calculateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 });
    }
    const result = await taxService.calculateTax(parsed.data.state, parsed.data.items);
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Tax calculation error:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
