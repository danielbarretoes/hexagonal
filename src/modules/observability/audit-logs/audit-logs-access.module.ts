import { Module } from '@nestjs/common';
import { AuditLogsModule } from './audit-logs.module';

@Module({
  imports: [AuditLogsModule],
  exports: [AuditLogsModule],
})
export class AuditLogsAccessModule {}
