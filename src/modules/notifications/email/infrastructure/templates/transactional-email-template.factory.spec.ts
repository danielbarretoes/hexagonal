import { TransactionalEmailTemplateFactory } from './transactional-email-template.factory';

describe('TransactionalEmailTemplateFactory', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      API_BASE_URL: 'https://api.hexagonal.test',
      APP_PUBLIC_URL: 'https://app.hexagonal.test',
      EMAIL_ENABLED: 'false',
      EMAIL_SES_REGION: 'us-east-1',
      EMAIL_FROM_EMAIL: 'noreply@hexagonal.test',
      EMAIL_FROM_NAME: 'Hexagonal Test',
      EMAIL_BRAND_NAME: 'Hexagonal Test',
      EMAIL_PASSWORD_RESET_PATH: '/reset-password',
      EMAIL_VERIFICATION_PATH: '/verify-email',
      EMAIL_INVITATION_PATH: '/accept-invitation',
      EMAIL_WELCOME_PATH: '/login',
      JWT_SECRET: 'your-super-secret-key-change-in-production-minimum-32-characters',
      JWT_EXPIRES_IN: '15m',
      DB_HOST: 'localhost',
      DB_PORT: '5432',
      DB_USERNAME: 'postgres',
      DB_PASSWORD: 'postgres',
      DB_DATABASE: 'hexagonal_test_db',
      LOG_LEVEL: 'debug',
      LOG_JSON: 'false',
      LOG_SERVICE_NAME: 'hexagonal-api-test',
      HTTP_BODY_LIMIT: '1mb',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('builds public token URLs inside rendered templates', () => {
    const factory = new TransactionalEmailTemplateFactory();

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
    const factory = new TransactionalEmailTemplateFactory();

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
