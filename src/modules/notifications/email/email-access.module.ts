import { Module } from '@nestjs/common';
import { SESv2Client } from '@aws-sdk/client-sesv2';
import { getAppConfig } from '../../../config/env/app-config';
import { TRANSACTIONAL_EMAIL_PORT } from '../../../shared/application/ports/transactional-email.token';
import { JobsAccessModule } from '../../jobs/jobs-access.module';
import {
  JOBS_RUNTIME_OPTIONS,
  type JobsRuntimeOptions,
} from '../../jobs/application/ports/jobs-runtime-options.token';
import { DIRECT_TRANSACTIONAL_EMAIL_PORT, TRANSACTIONAL_EMAIL_DELIVERY_MODE } from './email.tokens';
import { EMAIL_RUNTIME_OPTIONS, type EmailRuntimeOptions } from './email-runtime-options.token';
import { NoopTransactionalEmailAdapter } from './infrastructure/adapters/noop-transactional-email.adapter';
import { OutboxTransactionalEmailAdapter } from './infrastructure/adapters/outbox-transactional-email.adapter';
import { SesTransactionalEmailAdapter } from './infrastructure/adapters/ses-transactional-email.adapter';
import { SES_CLIENT } from './infrastructure/aws/ses-client.token';
import { TransactionalEmailTemplateFactory } from './infrastructure/templates/transactional-email-template.factory';

@Module({
  imports: [JobsAccessModule],
  providers: [
    {
      provide: EMAIL_RUNTIME_OPTIONS,
      useFactory: (): EmailRuntimeOptions => ({
        ...getAppConfig().email,
      }),
    },
    TransactionalEmailTemplateFactory,
    {
      provide: SES_CLIENT,
      useFactory: (emailRuntimeOptions: EmailRuntimeOptions) =>
        new SESv2Client({ region: emailRuntimeOptions.sesRegion }),
      inject: [EMAIL_RUNTIME_OPTIONS],
    },
    NoopTransactionalEmailAdapter,
    SesTransactionalEmailAdapter,
    OutboxTransactionalEmailAdapter,
    {
      provide: DIRECT_TRANSACTIONAL_EMAIL_PORT,
      useFactory: (
        emailRuntimeOptions: EmailRuntimeOptions,
        noopAdapter: NoopTransactionalEmailAdapter,
        sesAdapter: SesTransactionalEmailAdapter,
      ) => (emailRuntimeOptions.enabled ? sesAdapter : noopAdapter),
      inject: [EMAIL_RUNTIME_OPTIONS, NoopTransactionalEmailAdapter, SesTransactionalEmailAdapter],
    },
    {
      provide: TRANSACTIONAL_EMAIL_PORT,
      useFactory: (
        jobsRuntimeOptions: JobsRuntimeOptions,
        directAdapter: NoopTransactionalEmailAdapter | SesTransactionalEmailAdapter,
        outboxAdapter: OutboxTransactionalEmailAdapter,
      ) => (jobsRuntimeOptions.emailDeliveryMode === 'async' ? outboxAdapter : directAdapter),
      inject: [
        JOBS_RUNTIME_OPTIONS,
        DIRECT_TRANSACTIONAL_EMAIL_PORT,
        OutboxTransactionalEmailAdapter,
      ],
    },
    {
      provide: TRANSACTIONAL_EMAIL_DELIVERY_MODE,
      useFactory: (jobsRuntimeOptions: JobsRuntimeOptions) => jobsRuntimeOptions.emailDeliveryMode,
      inject: [JOBS_RUNTIME_OPTIONS],
    },
  ],
  exports: [
    DIRECT_TRANSACTIONAL_EMAIL_PORT,
    EMAIL_RUNTIME_OPTIONS,
    TRANSACTIONAL_EMAIL_DELIVERY_MODE,
    TRANSACTIONAL_EMAIL_PORT,
  ],
})
export class EmailAccessModule {}
