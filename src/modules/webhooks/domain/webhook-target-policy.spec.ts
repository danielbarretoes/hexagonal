import { assertWebhookTargetAllowed } from './webhook-target-policy';

describe('webhook target policy', () => {
  it('allows standard public https targets', () => {
    expect(
      assertWebhookTargetAllowed('https://example.com/webhooks', {
        requireHttps: true,
        allowPrivateTargets: false,
      }).toString(),
    ).toBe('https://example.com/webhooks');
  });

  it('rejects insecure http targets when https is required', () => {
    expect(() =>
      assertWebhookTargetAllowed('http://example.com/webhooks', {
        requireHttps: true,
        allowPrivateTargets: false,
      }),
    ).toThrow('https is required');
  });

  it('rejects localhost and private ip targets when private targets are disabled', () => {
    expect(() =>
      assertWebhookTargetAllowed('https://localhost/webhooks', {
        requireHttps: true,
        allowPrivateTargets: false,
      }),
    ).toThrow('private or local network targets are not allowed');

    expect(() =>
      assertWebhookTargetAllowed('https://192.168.1.10/webhooks', {
        requireHttps: true,
        allowPrivateTargets: false,
      }),
    ).toThrow('private or local network targets are not allowed');
  });
});
