import { Inject, Injectable } from '@nestjs/common';
import { SendEmailCommand, type SESv2Client } from '@aws-sdk/client-sesv2';
import { getAppConfig } from '../../../../../config/env/app-config';
import { writeStructuredLog } from '../../../../../common/observability/logging/structured-log.util';
import type {
  TransactionalEmailMessage,
  TransactionalEmailPort,
} from '../../../../../shared/domain/ports/transactional-email.port';
import { SES_CLIENT } from '../aws/ses-client.token';
import { TransactionalEmailTemplateFactory } from '../templates/transactional-email-template.factory';

@Injectable()
export class SesTransactionalEmailAdapter implements TransactionalEmailPort {
  private readonly emailConfig = getAppConfig().email;

  constructor(
    @Inject(SES_CLIENT)
    private readonly sesClient: Pick<SESv2Client, 'send'>,
    private readonly templateFactory: TransactionalEmailTemplateFactory,
  ) {}

  async send(message: TransactionalEmailMessage): Promise<void> {
    const renderedEmail = this.templateFactory.render(message);

    try {
      await this.sesClient.send(
        new SendEmailCommand({
          FromEmailAddress: `${this.emailConfig.fromName} <${this.emailConfig.fromEmail}>`,
          Destination: {
            ToAddresses: [message.to],
          },
          Content: {
            Simple: {
              Subject: {
                Data: renderedEmail.subject,
                Charset: 'UTF-8',
              },
              Body: {
                Text: {
                  Data: renderedEmail.textBody,
                  Charset: 'UTF-8',
                },
                Html: {
                  Data: renderedEmail.htmlBody,
                  Charset: 'UTF-8',
                },
              },
            },
          },
        }),
      );
    } catch (error) {
      writeStructuredLog('error', SesTransactionalEmailAdapter.name, 'SES delivery failed', {
        event: 'email.delivery.failed',
        emailType: message.type,
        provider: this.emailConfig.provider,
        errorMessage: error instanceof Error ? error.message : 'Unknown SES error',
      });
      throw error;
    }
  }
}
