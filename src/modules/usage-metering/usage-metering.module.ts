import { Module } from '@nestjs/common';
import { PermissionGuard } from '../../common/http/guards/permission.guard';
import { IamAuthorizationAccessModule } from '../iam/iam-authorization-access.module';
import { AuthSupportModule } from '../iam/auth/auth-support.module';
import { UsageMeteringAccessModule } from './usage-metering-access.module';
import { UsageMetricsController } from './presentation/controllers/usage-metrics.controller';

@Module({
  imports: [UsageMeteringAccessModule, AuthSupportModule, IamAuthorizationAccessModule],
  controllers: [UsageMetricsController],
  providers: [PermissionGuard],
  exports: [UsageMeteringAccessModule],
})
export class UsageMeteringModule {}
