import { Module } from '@nestjs/common';
import { UsageMeteringHttpModule } from '../common/http/usage-metering-http.module';
import { ObservabilityModule } from '../modules/observability/observability.module';
import { UsageMeteringModule } from '../modules/usage-metering/usage-metering.module';

@Module({
  imports: [ObservabilityModule, UsageMeteringHttpModule, UsageMeteringModule],
  exports: [ObservabilityModule, UsageMeteringHttpModule, UsageMeteringModule],
})
export class OperationsPresetModule {}
