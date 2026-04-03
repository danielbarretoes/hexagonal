import { Module } from '@nestjs/common';
import { JobsModule } from '../modules/jobs/jobs.module';
import { EmailModule } from '../modules/notifications/email/email.module';
import { WebhooksModule } from '../modules/webhooks/webhooks.module';

@Module({
  imports: [EmailModule, JobsModule, WebhooksModule],
  exports: [EmailModule, JobsModule, WebhooksModule],
})
export class IntegrationsPresetModule {}
