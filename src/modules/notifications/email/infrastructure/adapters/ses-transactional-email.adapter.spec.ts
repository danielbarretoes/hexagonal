import { writeStructuredLog } from '../../../../../common/observability/logging/structured-log.util';
import { SesTransactionalEmailAdapter } from './ses-transactional-email.adapter';
import { TransactionalEmailTemplateFactory } from '../templates/transactional-email-template.factory';

jest.mock('../../../../../common/observability/logging/structured-log.util', () => ({
  writeStructuredLog: jest.fn(),
}));

describe('SesTransactionalEmailAdapter', () => {
  const emailRuntimeOptions = {
    enabled: true,
    provider: 'ses',
    sesRegion: 'us-east-1',
    fromEmail: 'noreply@hexagonal.test',
    fromName: 'Hexagonal Test',
    brandName: 'Hexagonal Test',
    appPublicUrl: 'https://app.hexagonal.test',
    passwordResetPath: '/reset-password',
    emailVerificationPath: '/verify-email',
    invitationPath: '/accept-invitation',
    welcomePath: '/login',
  } as const;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps a transactional message into the SESv2 SendEmailCommand payload', async () => {
    const send = jest.fn().mockResolvedValue(undefined);

    const adapter = new SesTransactionalEmailAdapter(
      { send } as never,
      new TransactionalEmailTemplateFactory(emailRuntimeOptions),
      emailRuntimeOptions,
    );

    await adapter.send({
      type: 'email_verification',
      to: 'john@example.com',
      recipientName: 'John Doe',
      verificationToken: 'opaque-token',
      expiresInHours: 24,
    });

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].input.FromEmailAddress).toBe(
      'Hexagonal Test <noreply@hexagonal.test>',
    );
    expect(send.mock.calls[0][0].input.Destination.ToAddresses).toEqual(['john@example.com']);
    expect(send.mock.calls[0][0].input.Content.Simple.Subject.Data).toContain('verify your email');
  });

  it('logs SES failures without exposing recipient email addresses', async () => {
    const send = jest.fn().mockRejectedValue(new Error('ses-down'));

    const adapter = new SesTransactionalEmailAdapter(
      { send } as never,
      new TransactionalEmailTemplateFactory(emailRuntimeOptions),
      emailRuntimeOptions,
    );

    await expect(
      adapter.send({
        type: 'email_verification',
        to: 'john@example.com',
        recipientName: 'John Doe',
        verificationToken: 'opaque-token',
        expiresInHours: 24,
      }),
    ).rejects.toThrow('ses-down');

    expect(writeStructuredLog).toHaveBeenCalledWith(
      'error',
      'SesTransactionalEmailAdapter',
      'SES delivery failed',
      expect.objectContaining({
        event: 'email.delivery.failed',
        emailType: 'email_verification',
        provider: 'ses',
        errorMessage: 'ses-down',
      }),
    );
    expect(writeStructuredLog).not.toHaveBeenCalledWith(
      'error',
      'SesTransactionalEmailAdapter',
      'SES delivery failed',
      expect.objectContaining({
        recipient: 'john@example.com',
      }),
    );
  });
});
