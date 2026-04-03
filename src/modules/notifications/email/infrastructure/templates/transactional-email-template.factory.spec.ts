import { TransactionalEmailTemplateFactory } from './transactional-email-template.factory';

describe('TransactionalEmailTemplateFactory', () => {
  const emailRuntimeOptions = {
    enabled: false,
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

  it('builds public token URLs inside rendered templates', () => {
    const factory = new TransactionalEmailTemplateFactory(emailRuntimeOptions);

    const rendered = factory.render({
      type: 'password_reset',
      to: 'john@example.com',
      recipientName: 'John Doe',
      resetToken: 'opaque-token',
      expiresInMinutes: 15,
    });

    expect(rendered.subject).toContain('reset your password');
    expect(rendered.textBody).toContain(
      'https://app.hexagonal.test/reset-password?token=opaque-token',
    );
    expect(rendered.htmlBody).toContain('Reset password');
  });

  it('escapes user-controlled values in html email bodies', () => {
    const factory = new TransactionalEmailTemplateFactory(emailRuntimeOptions);

    const rendered = factory.render({
      type: 'organization_invitation',
      to: 'john@example.com',
      organizationName: 'Acme <script>alert(1)</script>',
      roleCode: 'member"><img src=x onerror=alert(1)>',
      invitationToken: 'opaque-token',
      expiresInDays: 7,
    });

    expect(rendered.htmlBody).toContain('Acme &lt;script&gt;alert(1)&lt;/script&gt;');
    expect(rendered.htmlBody).toContain('member&quot;&gt;&lt;img src=x onerror=alert(1)&gt;');
    expect(rendered.htmlBody).not.toContain('<script>alert(1)</script>');
    expect(rendered.htmlBody).not.toContain('<img src=x onerror=alert(1)>');
  });
});
