import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getAppConfig } from '../../config/env/app-config';
import { USAGE_METER_PORT } from '../../shared/application/ports/usage-meter.token';
import { GetApiKeyUsageSummaryUseCase } from './application/use-cases/get-api-key-usage-summary.use-case';
import { USAGE_COUNTER_REPOSITORY_TOKEN } from './application/ports/usage-counter-repository.token';
import {
  USAGE_METERING_RUNTIME_OPTIONS,
  type UsageMeteringRuntimeOptions,
} from './application/ports/usage-metering-runtime-options.token';
import { UsageMeterService } from './application/usage-meter.service';
import { NoopUsageMeterAdapter } from './infrastructure/adapters/noop-usage-meter.adapter';
import { UsageCounterTypeOrmEntity } from './infrastructure/persistence/typeorm/entities/usage-counter.entity';
import { UsageCounterTypeOrmRepository } from './infrastructure/persistence/typeorm/repositories/usage-counter.typeorm-repository';

@Module({
  imports: [TypeOrmModule.forFeature([UsageCounterTypeOrmEntity])],
  providers: [
    {
      provide: USAGE_METERING_RUNTIME_OPTIONS,
      useFactory: (): UsageMeteringRuntimeOptions => ({
        enabled: getAppConfig().usageMetering.enabled,
      }),
    },
    { provide: USAGE_COUNTER_REPOSITORY_TOKEN, useClass: UsageCounterTypeOrmRepository },
    UsageCounterTypeOrmRepository,
    UsageMeterService,
    NoopUsageMeterAdapter,
    GetApiKeyUsageSummaryUseCase,
    {
      provide: USAGE_METER_PORT,
      useFactory: (
        runtimeOptions: UsageMeteringRuntimeOptions,
        noopAdapter: NoopUsageMeterAdapter,
        usageMeterService: UsageMeterService,
      ) => (runtimeOptions.enabled ? usageMeterService : noopAdapter),
      inject: [USAGE_METERING_RUNTIME_OPTIONS, NoopUsageMeterAdapter, UsageMeterService],
    },
  ],
  exports: [GetApiKeyUsageSummaryUseCase, USAGE_METERING_RUNTIME_OPTIONS, USAGE_METER_PORT],
})
export class UsageMeteringAccessModule {}
