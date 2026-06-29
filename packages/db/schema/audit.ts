import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  text,
  jsonb,
  bigserial,
  index,
} from 'drizzle-orm/pg-core';

// Audit log for all critical actions
export const auditLog = pgTable(
  'audit_log',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    actorId: varchar('actor_id', { length: 255 }),
    actorType: varchar('actor_type', { length: 20 }), // staff, customer, system
    action: varchar('action', { length: 100 }).notNull(),
    entityType: varchar('entity_type', { length: 50 }),
    entityId: uuid('entity_id'),
    beforeState: jsonb('before_state'),
    afterState: jsonb('after_state'),
    ipAddress: varchar('ip_address', { length: 50 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_audit_actor').on(table.actorId),
    index('idx_audit_entity').on(table.entityType, table.entityId),
    index('idx_audit_action').on(table.action),
    index('idx_audit_created').on(table.createdAt),
  ]
);

// Inferred types
export type AuditLog = typeof auditLog.$inferSelect;
export type NewAuditLog = typeof auditLog.$inferInsert;
