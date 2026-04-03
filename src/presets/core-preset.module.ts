import { Module } from '@nestjs/common';
import { IdempotencyHttpModule } from '../common/http/idempotency-http.module';
import { ProblemDetailsRuntimeModule } from '../common/http/problem-details-runtime.module';
import { TypeormTransactionModule } from '../common/infrastructure/database/typeorm/transaction/typeorm-transaction.module';
import { TraceModule } from '../common/observability/tracing/trace.module';
import { TenantModule } from '../common/tenant/tenant.module';
import { HealthModule } from '../health/health.module';
import { IamModule } from '../modules/iam/iam.module';

@Module({
  imports: [
    ProblemDetailsRuntimeModule,
    TraceModule,
    TypeormTransactionModule,
    IdempotencyHttpModule,
    TenantModule,
    HealthModule,
    IamModule,
  ],
  exports: [
    ProblemDetailsRuntimeModule,
    TraceModule,
    TypeormTransactionModule,
    IdempotencyHttpModule,
    TenantModule,
    HealthModule,
    IamModule,
  ],
})
export class CorePresetModule {}
