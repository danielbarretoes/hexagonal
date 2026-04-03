import { CreateWebhookEndpointUseCase } from './create-webhook-endpoint.use-case';
import { InvalidWebhookTargetException } from '../../domain/errors/invalid-webhook-target.exception';

describe('CreateWebhookEndpointUseCase', () => {
  const create = jest.fn();
  const encrypt = jest.fn();
  const record = jest.fn();
  const passthroughEndpoint = async <T extends Record<string, unknown>>(endpoint: T): Promise<T> =>
    endpoint;
  const runtimeOptions = {
    enabled: true,
    timeoutMs: 1000,
    secretEncryptionKey: 'your-webhook-secret-change-in-production-minimum-32-characters',
    requireHttps: true,
    allowPrivateTargets: false,
  } as const;

  beforeEach(() => {
    jest.clearAllMocks();
    create.mockImplementation(passthroughEndpoint);
    encrypt.mockReturnValue('ciphertext');
    record.mockResolvedValue(undefined);
  });

  it('rejects private webhook targets before persisting them', async () => {
    const useCase = new CreateWebhookEndpointUseCase(
      { create } as never,
      { encrypt } as never,
      { record } as never,
      runtimeOptions,
    );

    await expect(
      useCase.execute({
        organizationId: 'org-1',
        actorUserId: 'user-1',
        name: 'Internal hook',
        url: 'https://localhost/webhooks',
        events: ['iam.user.created'],
      }),
    ).rejects.toThrow(InvalidWebhookTargetException);

    expect(create).not.toHaveBeenCalled();
  });

  it('normalizes and persists an allowed webhook target', async () => {
    const useCase = new CreateWebhookEndpointUseCase(
      { create } as never,
      { encrypt } as never,
      { record } as never,
      runtimeOptions,
    );

    await useCase.execute({
      organizationId: 'org-1',
      actorUserId: 'user-1',
      name: 'Partner hook',
      url: 'https://example.com/webhooks',
      events: ['iam.user.created'],
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://example.com/webhooks',
      }),
    );
  });
});
