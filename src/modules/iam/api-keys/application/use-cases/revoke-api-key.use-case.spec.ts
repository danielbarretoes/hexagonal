import { ApiKey } from '../../domain/entities/api-key.entity';
import { ApiKeyNotFoundException } from '../../../shared/domain/exceptions';
import { RevokeApiKeyUseCase } from './revoke-api-key.use-case';

function createApiKey(overrides?: Partial<Parameters<typeof ApiKey.rehydrate>[0]>): ApiKey {
  return ApiKey.rehydrate({
    id: 'key-1',
    organizationId: 'org-1',
    ownerUserId: 'user-1',
    name: 'Primary key',
    keyPrefix: 'saas_live',
    secretHash: 'secret-hash',
    scopes: ['projects.read'],
    expiresAt: null,
    lastUsedAt: null,
    lastUsedIp: null,
    revokedAt: null,
    createdAt: new Date('2026-04-01T00:00:00.000Z'),
    updatedAt: new Date('2026-04-01T00:00:00.000Z'),
    ...overrides,
  });
}

describe('RevokeApiKeyUseCase', () => {
  const findById = jest.fn();
  const update = jest.fn();
  const record = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fails when the API key does not belong to the owner or organization', async () => {
    findById.mockResolvedValue(null);

    const useCase = new RevokeApiKeyUseCase({ findById, update } as never, { record } as never);

    await expect(
      useCase.execute({
        apiKeyId: 'key-1',
        organizationId: 'org-1',
        ownerUserId: 'user-1',
      }),
    ).rejects.toThrow(ApiKeyNotFoundException);
  });

  it('returns early when the API key is already revoked', async () => {
    findById.mockResolvedValue(
      createApiKey({
        revokedAt: new Date('2026-04-01T01:00:00.000Z'),
      }),
    );

    const useCase = new RevokeApiKeyUseCase({ findById, update } as never, { record } as never);

    await useCase.execute({
      apiKeyId: 'key-1',
      organizationId: 'org-1',
      ownerUserId: 'user-1',
    });

    expect(update).not.toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
  });

  it('revokes the key and records the audit trail on success', async () => {
    findById.mockResolvedValue(createApiKey());

    const useCase = new RevokeApiKeyUseCase({ findById, update } as never, { record } as never);

    await useCase.execute({
      apiKeyId: 'key-1',
      organizationId: 'org-1',
      ownerUserId: 'user-1',
    });

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ id: 'key-1' }));
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'iam.api_key.revoked',
        resourceId: 'key-1',
      }),
    );
  });
});
