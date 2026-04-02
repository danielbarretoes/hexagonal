import { CreateWebhookEndpointUseCase } from './create-webhook-endpoint.use-case';
import { InvalidWebhookTargetException } from '../../domain/errors/invalid-webhook-target.exception';

describe('CreateWebhookEndpointUseCase', () => {
  const originalEnv = { ...process.env };
  const create = jest.fn();
  const encrypt = jest.fn();
  const record = jest.fn();
  const passthroughEndpoint = async <T extends Record<string, unknown>>(endpoint: T): Promise<T> =>
    endpoint;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      WEBHOOKS_REQUIRE_HTTPS: 'true',
      WEBHOOKS_ALLOW_PRIVATE_TARGETS: 'false',
      WEBHOOKS_SECRET_ENCRYPTION_KEY:
        'your-webhook-secret-change-in-production-minimum-32-characters',
    };
    create.mockImplementation(passthroughEndpoint);
    encrypt.mockReturnValue('ciphertext');
    record.mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('rejects private webhook targets before persisting them', async () => {
    const useCase = new CreateWebhookEndpointUseCase(
      { create } as never,
      { encrypt } as never,
      { record } as never,
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
