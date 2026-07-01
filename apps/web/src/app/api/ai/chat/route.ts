import { NextRequest, NextResponse } from 'next/server';
import { chatWithPharmacist } from '@/lib/services/ai.service';

export async function POST(request: NextRequest) {
  try {
    const { messages, context } = await request.json();
    if (!messages?.length) {
      return NextResponse.json({ error: 'messages is required' }, { status: 400 });
    }
    const result = await chatWithPharmacist(messages, context);
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('AI chat error:', (error as Error).message);
    return NextResponse.json({ error: 'Chat service unavailable' }, { status: 500 });
  }
}
