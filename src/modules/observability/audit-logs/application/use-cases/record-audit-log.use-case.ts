import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_LOG_REPOSITORY_TOKEN } from '../ports/audit-log.repository.token';
import type { AuditLogRepositoryPort } from '../../domain/ports/audit-log.repository.port';
import { AuditLog } from '../../domain/entities/audit-log.entity';
import type {
  AdminAuditEntry,
  AdminAuditPort,
} from '../../../../../shared/domain/ports/admin-audit.port';

@Injectable()
export class RecordAuditLogUseCase implements AdminAuditPort {
  constructor(
    @Inject(AUDIT_LOG_REPOSITORY_TOKEN)
    private readonly auditLogRepository: AuditLogRepositoryPort,
  ) {}

  async record(command: AdminAuditEntry): Promise<void> {
    await this.auditLogRepository.create(
      AuditLog.create({
        action: command.action,
        actorUserId: command.actorUserId ?? null,
        organizationId: command.organizationId ?? null,
        resourceType: command.resourceType,
        resourceId: command.resourceId ?? null,
        payload: command.payload ?? null,
      }),
    );
  }
}
