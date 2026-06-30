import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { db } from '@/lib/db';
import { customers } from '@pharmaflow/db/schema';
import { eq } from 'drizzle-orm';

interface ClerkEmailAddress { email_address: string; id: string; }
interface ClerkUserPayload {
  id: string;
  email_addresses: ClerkEmailAddress[];
  primary_email_address_id: string;
  first_name: string | null;
  last_name: string | null;
  phone_numbers: { phone_number: string }[];
}

async function upsertCustomer(data: { clerkUserId: string; email: string; firstName?: string; lastName?: string; phone?: string }) {
  const existing = await db.select({ id: customers.id }).from(customers)
    .where(eq(customers.clerkUserId, data.clerkUserId)).limit(1);

  if (existing.length > 0) {
    await db.update(customers).set({
      firstName: data.firstName, lastName: data.lastName, phone: data.phone, updatedAt: new Date(),
    }).where(eq(customers.clerkUserId, data.clerkUserId));
  } else {
    await db.insert(customers).values({
      clerkUserId: data.clerkUserId, email: data.email,
      firstName: data.firstName, lastName: data.lastName, phone: data.phone,
    }).onConflictDoNothing({ target: customers.clerkUserId });
  }
}

export async function POST(request: NextRequest) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;

  if (!secret) {
    console.warn('[webhook] CLERK_WEBHOOK_SECRET not set — skipping verification');
    return NextResponse.json({ received: true });
  }

  const svixId = request.headers.get('svix-id');
  const svixTimestamp = request.headers.get('svix-timestamp');
  const svixSignature = request.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
  }

  const body = await request.text();

  let event: { type: string; data: ClerkUserPayload };
  try {
    const wh = new Webhook(secret);
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as { type: string; data: ClerkUserPayload };
  } catch (err) {
    console.error('[webhook] Clerk signature verification failed:', (err as Error).message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    const { type, data } = event;

    if (type === 'user.created' || type === 'user.updated') {
      const primaryEmail = data.email_addresses.find((e) => e.id === data.primary_email_address_id);
      if (!primaryEmail) return NextResponse.json({ received: true });
      await upsertCustomer({
        clerkUserId: data.id,
        email: primaryEmail.email_address,
        firstName: data.first_name ?? undefined,
        lastName: data.last_name ?? undefined,
        phone: data.phone_numbers?.[0]?.phone_number ?? undefined,
      });
    }

    if (type === 'user.deleted') {
      await db.update(customers).set({ deletedAt: new Date(), isActive: false })
        .where(eq(customers.clerkUserId, data.id));
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[webhook] Error processing Clerk event:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
