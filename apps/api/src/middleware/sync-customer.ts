import { Request, Response, NextFunction } from 'express';
import { getAuth } from '@clerk/express';
import { db } from '../lib/db';
import { customers } from '@pharmaflow/db/schema';
import { eq } from 'drizzle-orm';

// In-memory set of Clerk userIds we've already synced this server session.
// Avoids a DB lookup on every authenticated request.
const syncedUsers = new Set<string>();

/**
 * Middleware: auto-create a customer record for any authenticated Clerk user
 * who doesn't have one yet. Runs silently — never blocks the request.
 *
 * Works as a local-dev replacement for the Clerk webhook (user.created).
 * Safe to keep in production alongside the webhook — upsert logic prevents duplicates.
 */
export function syncCustomer(req: Request, _res: Response, next: NextFunction) {
  const auth = getAuth(req);
  if (!auth?.userId) return next();

  const clerkUserId = auth.userId;

  // Already synced this session — skip
  if (syncedUsers.has(clerkUserId)) return next();

  // Fire-and-forget — don't delay the response
  ensureCustomerExists(clerkUserId, auth.sessionClaims).catch((err) =>
    console.error('[sync-customer] Error:', err)
  );

  next();
}

async function ensureCustomerExists(
  clerkUserId: string,
  claims: Record<string, unknown> | null | undefined
) {
  // Check if customer already exists
  const [existing] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.clerkUserId, clerkUserId))
    .limit(1);

  if (existing) {
    syncedUsers.add(clerkUserId);
    return;
  }

  // Extract info from session claims
  const email =
    (claims as any)?.email ||
    (claims as any)?.primary_email ||
    (claims as any)?.emailAddress ||
    `${clerkUserId}@placeholder.local`;

  const firstName = (claims as any)?.first_name || (claims as any)?.firstName || null;
  const lastName = (claims as any)?.last_name || (claims as any)?.lastName || null;

  await db.insert(customers).values({
    clerkUserId,
    email,
    firstName,
    lastName,
  }).onConflictDoNothing({ target: customers.clerkUserId });

  syncedUsers.add(clerkUserId);
  console.log(`[sync-customer] Created customer for Clerk user ${clerkUserId}`);
}
