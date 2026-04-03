import { Module } from '@nestjs/common';
import { AuditLogsAccessModule } from './audit-logs-access.module';

@Module({
  imports: [AuditLogsAccessModule],
  exports: [AuditLogsAccessModule],
})
export class AuditLogsModule {}
