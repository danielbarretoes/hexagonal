import type { AuditLog } from '../entities/audit-log.entity';

export interface AuditLogRepositoryPort {
  create(auditLog: AuditLog): Promise<AuditLog>;
}
