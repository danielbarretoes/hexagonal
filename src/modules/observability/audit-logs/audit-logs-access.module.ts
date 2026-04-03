import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ADMIN_AUDIT_PORT } from '../../../shared/application/ports/admin-audit.token';
import { AUDIT_LOG_REPOSITORY_TOKEN } from './application/ports/audit-log.repository.token';
import { RecordAuditLogUseCase } from './application/use-cases/record-audit-log.use-case';
import { AuditLogTypeOrmEntity } from './infrastructure/persistence/typeorm/entities/audit-log.entity';
import { AuditLogTypeOrmRepository } from './infrastructure/persistence/typeorm/repositories/audit-log.typeorm-repository';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLogTypeOrmEntity])],
  providers: [
    { provide: AUDIT_LOG_REPOSITORY_TOKEN, useClass: AuditLogTypeOrmRepository },
    { provide: ADMIN_AUDIT_PORT, useExisting: RecordAuditLogUseCase },
    AuditLogTypeOrmRepository,
    RecordAuditLogUseCase,
  ],
  exports: [ADMIN_AUDIT_PORT, RecordAuditLogUseCase],
})
export class AuditLogsAccessModule {}
