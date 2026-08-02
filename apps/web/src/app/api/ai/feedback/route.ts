import { NextRequest, NextResponse } from 'next/server';
import { writeAuditLog } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const { messageContent, rating, userMessage } = await request.json();
    if (!messageContent || !rating) {
      return NextResponse.json({ error: 'messageContent and rating are required' }, { status: 400 });
    }
    await writeAuditLog({
      actorType: 'customer',
      action: 'ai.chat_feedback',
      entityType: 'ai_chat',
      afterState: {
        rating,
        aiMessage: messageContent.substring(0, 500),
        userMessage: userMessage?.substring(0, 500),
      },
    });
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error('Feedback error:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
