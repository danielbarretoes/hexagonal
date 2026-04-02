import { sanitizeHttpLogErrorStack, sanitizeHttpLogPayload } from './http-log.serializer';

describe('http-log serializer', () => {
  it('redacts sensitive fields recursively', () => {
    const payload = sanitizeHttpLogPayload({
      password: 'Password123',
      apiKey: 'hex_live_123.secret',
      nested: {
        accessToken: 'secret-token',
        verificationToken: 'opaque-verification-token',
      },
      invitationToken: 'opaque-invitation-token',
      profile: {
        firstName: 'John',
        resetToken: 'opaque-reset-token',
      },
    });

    expect(payload).toEqual({
      password: '[REDACTED]',
      apiKey: '[REDACTED]',
      nested: {
        accessToken: '[REDACTED]',
        verificationToken: '[REDACTED]',
      },
      invitationToken: '[REDACTED]',
      profile: {
        firstName: 'John',
        resetToken: '[REDACTED]',
      },
    });
  });

  it('truncates long stacks to keep log rows bounded', () => {
    const veryLongStack = 'stack-line'.repeat(600);
    const sanitized = sanitizeHttpLogErrorStack(veryLongStack);

    expect(sanitized).toContain('...[TRUNCATED]');
    expect(sanitized?.length).toBeLessThanOrEqual(4014);
  });
});
