import { Module } from '@nestjs/common';
import { SESv2Client } from '@aws-sdk/client-sesv2';
import { getAppConfig } from '../../../config/env/app-config';
import { TRANSACTIONAL_EMAIL_PORT } from '../../../shared/application/ports/transactional-email.token';
import { NoopTransactionalEmailAdapter } from './infrastructure/adapters/noop-transactional-email.adapter';
import { SesTransactionalEmailAdapter } from './infrastructure/adapters/ses-transactional-email.adapter';
import { SES_CLIENT } from './infrastructure/aws/ses-client.token';
import { TransactionalEmailTemplateFactory } from './infrastructure/templates/transactional-email-template.factory';

@Module({
  providers: [
    TransactionalEmailTemplateFactory,
    {
      provide: SES_CLIENT,
      useFactory: () => new SESv2Client({ region: getAppConfig().email.sesRegion }),
    },
    NoopTransactionalEmailAdapter,
    SesTransactionalEmailAdapter,
    {
      provide: TRANSACTIONAL_EMAIL_PORT,
      useFactory: (
        noopAdapter: NoopTransactionalEmailAdapter,
        sesAdapter: SesTransactionalEmailAdapter,
      ) => (getAppConfig().email.enabled ? sesAdapter : noopAdapter),
      inject: [NoopTransactionalEmailAdapter, SesTransactionalEmailAdapter],
    },
  ],
  exports: [TRANSACTIONAL_EMAIL_PORT],
})
export class EmailModule {}
