import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuditLogRepositoryPort } from '../../../../domain/ports/audit-log.repository.port';
import type { AuditLog } from '../../../../domain/entities/audit-log.entity';
import { AuditLogTypeOrmEntity } from '../entities/audit-log.entity';

@Injectable()
export class AuditLogTypeOrmRepository implements AuditLogRepositoryPort {
  constructor(
    @InjectRepository(AuditLogTypeOrmEntity)
    private readonly repository: Repository<AuditLogTypeOrmEntity>,
  ) {}

  async create(auditLog: AuditLog): Promise<AuditLog> {
    await this.repository.query(
      `
        INSERT INTO "audit_logs" (
          "id",
          "action",
          "actor_user_id",
          "organization_id",
          "resource_type",
          "resource_id",
          "payload",
          "created_at"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        auditLog.id,
        auditLog.action,
        auditLog.actorUserId,
        auditLog.organizationId,
        auditLog.resourceType,
        auditLog.resourceId,
        auditLog.payload,
        auditLog.createdAt,
      ],
    );

    return auditLog;
  }
}
