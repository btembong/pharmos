import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { StaffRole } from '@pharmaflow/types';

export const ROLE_PERMISSIONS: Record<StaffRole, string[]> = {
  super_admin: ['*'],
  pharmacist: ['orders.read', 'orders.update', 'products.read'],
  inventory_manager: ['inventory.*', 'products.*'],
  finance: ['payments.*', 'orders.read', 'reports.*'],
  customer_support: ['orders.read', 'customers.read'],
};

export async function getAuthOrError(): Promise<
  { userId: string; role: StaffRole | null } | NextResponse
> {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: 'Authentication required', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }
  const claims = sessionClaims as any;
  const role = (claims?.metadata?.role ?? claims?.publicMetadata?.role ?? null) as StaffRole | null;
  return { userId, role };
}

export async function requireAuth(): Promise<{ userId: string; role: StaffRole | null } | NextResponse> {
  return getAuthOrError();
}

export async function requireRole(...roles: StaffRole[]): Promise<{ userId: string; role: StaffRole } | NextResponse> {
  const result = await getAuthOrError();
  if (result instanceof NextResponse) return result;

  if (!result.role || !roles.includes(result.role)) {
    return NextResponse.json(
      { error: 'Insufficient permissions', code: 'FORBIDDEN' },
      { status: 403 }
    );
  }
  return { userId: result.userId, role: result.role };
}

export function isAuthError(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}
