import { Request, Response, NextFunction } from 'express';
import { getAuth } from '@clerk/express';
import type { StaffRole } from '@pharmaflow/types';

export const ROLE_PERMISSIONS: Record<StaffRole, string[]> = {
  super_admin: ['*'],
  pharmacist: ['orders.read', 'orders.update', 'products.read'],
  inventory_manager: ['inventory.*', 'products.*'],
  finance: ['payments.*', 'orders.read', 'reports.*'],
  customer_support: ['orders.read', 'customers.read'],
};

function hasPermission(role: StaffRole, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  if (perms.includes('*')) return true;
  return perms.some((p) => {
    if (p === permission) return true;
    if (p.endsWith('.*')) {
      const prefix = p.slice(0, -2);
      return permission.startsWith(prefix);
    }
    return false;
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
    return;
  }
  next();
}

export function requireRole(...roles: StaffRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = getAuth(req);
    if (!auth?.userId) {
      res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
      return;
    }

    const claims = auth.sessionClaims as any;
    const userRole = (claims?.metadata?.role || claims?.publicMetadata?.role || claims?.public_metadata?.role) as StaffRole | undefined;

    // In development, allow authenticated users through if role metadata isn't configured in session token yet
    if (!userRole && process.env.NODE_ENV === 'development') {
      next();
      return;
    }

    if (!userRole || !roles.includes(userRole)) {
      res.status(403).json({ error: 'Insufficient permissions', code: 'FORBIDDEN' });
      return;
    }
    next();
  };
}

export function requireAnyRole(roles: StaffRole[]) {
  return requireRole(...roles);
}

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = getAuth(req);
    if (!auth?.userId) {
      res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
      return;
    }

    const userRole = (auth.sessionClaims?.metadata as any)?.role as StaffRole | undefined;
    if (!userRole || !hasPermission(userRole, permission)) {
      res.status(403).json({ error: 'Insufficient permissions', code: 'FORBIDDEN' });
      return;
    }
    next();
  };
}
