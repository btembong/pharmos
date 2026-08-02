import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { siteSettings } from '@pharmaflow/db/schema';
import { requireRole, isAuthError } from '@/lib/auth';

// GET /api/settings/site — public, returns all settings as { key: value }
export async function GET() {
  try {
    const rows = await db.select().from(siteSettings);
    const map: Record<string, string | null> = {};
    for (const row of rows) map[row.key] = row.value;
    return NextResponse.json({ data: map });
  } catch {
    return NextResponse.json({ data: {} });
  }
}

// PUT /api/settings/site — admin only, upserts key-value pairs
export async function PUT(request: NextRequest) {
  const auth = await requireRole('super_admin', 'inventory_manager');
  if (isAuthError(auth)) return auth;

  try {
    const body: Record<string, string | null> = await request.json();
    for (const [key, value] of Object.entries(body)) {
      await db
        .insert(siteSettings)
        .values({ key, value: value ?? null })
        .onConflictDoUpdate({
          target: siteSettings.key,
          set: { value: value ?? null, updatedAt: new Date() },
        });
    }
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    console.error('Site settings save error:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
