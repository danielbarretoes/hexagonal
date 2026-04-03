import { AesWebhookSecretCipherAdapter } from './aes-webhook-secret-cipher.adapter';

describe('AesWebhookSecretCipherAdapter', () => {
  const runtimeOptions = {
    enabled: true,
    timeoutMs: 1000,
    secretEncryptionKey: 'your-webhook-secret-change-in-production-minimum-32-characters',
    requireHttps: false,
    allowPrivateTargets: true,
  } as const;

  it('encrypts and decrypts webhook secrets symmetrically', async () => {
    const adapter = new AesWebhookSecretCipherAdapter(runtimeOptions);
    const ciphertext = adapter.encrypt('whsec_test_secret');

    expect(ciphertext).not.toBe('whsec_test_secret');
    expect(adapter.decrypt(ciphertext)).toBe('whsec_test_secret');
  });

  it('rejects malformed ciphertext payloads', async () => {
    const adapter = new AesWebhookSecretCipherAdapter(runtimeOptions);

    expect(() => adapter.decrypt('not-valid')).toThrow('Invalid webhook secret ciphertext');
  });
});
