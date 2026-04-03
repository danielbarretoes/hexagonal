import { Module } from '@nestjs/common';
import { PermissionGuard } from '../../common/http/guards/permission.guard';
import { AuthSupportModule } from '../iam/auth/auth-support.module';
import { IamAuthorizationAccessModule } from '../iam/iam-authorization-access.module';
import { WebhooksAccessModule } from './webhooks-access.module';
import { WebhooksController } from './presentation/controllers/webhooks.controller';

@Module({
  imports: [WebhooksAccessModule, AuthSupportModule, IamAuthorizationAccessModule],
  controllers: [WebhooksController],
  providers: [PermissionGuard],
  exports: [WebhooksAccessModule],
})
export class WebhooksModule {}
