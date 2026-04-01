import { Module } from '@nestjs/common';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { HttpLogsModule } from './http-logs/http-logs.module';

@Module({
  imports: [HttpLogsModule, AuditLogsModule],
  exports: [HttpLogsModule, AuditLogsModule],
})
export class ObservabilityModule {}
