import { db } from './db';
import { auditLog } from '@pharmaflow/db/schema';

interface AuditEntry {
  actorId?: string;
  actorType: 'staff' | 'customer' | 'system';
  action: string;
  entityType: string;
  entityId?: string;
  beforeState?: unknown;
  afterState?: unknown;
  ipAddress?: string;
  userAgent?: string;
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  await db.insert(auditLog).values({
    actorId: entry.actorId,
    actorType: entry.actorType,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    beforeState: entry.beforeState,
    afterState: entry.afterState,
    ipAddress: entry.ipAddress,
    userAgent: entry.userAgent,
  });
}
