import { DataSource } from 'typeorm';
import type { TypeormRlsRuntimeOptions } from '../src/common/infrastructure/database/typeorm/transaction/typeorm-rls-runtime-options.token';
import { WebhookEndpoint } from '../src/modules/webhooks/domain/entities/webhook-endpoint.entity';
import { WebhookEndpointTypeOrmRepository } from '../src/modules/webhooks/infrastructure/persistence/typeorm/repositories/webhook-endpoint.typeorm-repository';
import { resetTestDatabase, useTestDatabaseEnvironment } from './support/test-database';

const rlsRuntimeOptions: TypeormRlsRuntimeOptions = {
  runtimeRole: 'hexagonal_app_runtime',
};

async function seedWebhookDependencies(dataSource: DataSource): Promise<void> {
  await dataSource.query('INSERT INTO "organizations" ("id", "name") VALUES ($1, $2)', [
    '00000000-0000-4000-8000-000000000701',
    'Acme',
  ]);
  await dataSource.query(
    `
      INSERT INTO "users" (
        "id",
        "email",
        "password_hash",
        "first_name",
        "last_name",
        "email_verified_at"
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [
      '00000000-0000-4000-8000-000000000702',
      'owner@example.com',
      'hash',
      'Owner',
      'User',
      new Date('2026-04-01T00:00:00.000Z'),
    ],
  );
}

describe('WebhookEndpointTypeOrmRepository (integration, PostgreSQL)', () => {
  let dataSource: DataSource;
  let repository: WebhookEndpointTypeOrmRepository;

  beforeAll(() => {
    jest.setTimeout(30000);
  });

  beforeEach(async () => {
    useTestDatabaseEnvironment();
    dataSource = await resetTestDatabase();
    repository = new WebhookEndpointTypeOrmRepository(dataSource as never, rlsRuntimeOptions);
    await seedWebhookDependencies(dataSource);
  });

  afterEach(async () => {
    await dataSource?.destroy();
  });

  it('creates webhook endpoints and filters them by organization and subscribed event', async () => {
    await repository.create(
      WebhookEndpoint.create({
        id: '00000000-0000-4000-8000-000000000401',
        organizationId: '00000000-0000-4000-8000-000000000701',
        createdByUserId: '00000000-0000-4000-8000-000000000702',
        name: 'User events',
        url: 'https://example.com/user-events',
        events: ['iam.user.created', 'iam.user.created'],
        secretCiphertext: 'ciphertext-1',
      }),
    );
    await repository.create(
      WebhookEndpoint.create({
        id: '00000000-0000-4000-8000-000000000402',
        organizationId: '00000000-0000-4000-8000-000000000701',
        createdByUserId: '00000000-0000-4000-8000-000000000702',
        name: 'Member events',
        url: 'https://example.com/member-events',
        events: ['iam.member.added'],
        secretCiphertext: 'ciphertext-2',
      }),
    );

    const paginated = await repository.findPaginatedByOrganization(
      '00000000-0000-4000-8000-000000000701',
      1,
      10,
    );
    const subscribed = await repository.findSubscribedByOrganization(
      '00000000-0000-4000-8000-000000000701',
      'iam.user.created',
    );

    expect(paginated.items).toHaveLength(2);
    expect(subscribed).toHaveLength(1);
    expect(subscribed[0]?.events).toEqual(['iam.user.created']);
  });

  it('updates delivery metadata and deletes endpoints within the tenant scope', async () => {
    const created = await repository.create(
      WebhookEndpoint.create({
        id: '00000000-0000-4000-8000-000000000403',
        organizationId: '00000000-0000-4000-8000-000000000701',
        createdByUserId: '00000000-0000-4000-8000-000000000702',
        name: 'Delivery events',
        url: 'https://example.com/delivery-events',
        events: ['iam.member.added'],
        secretCiphertext: 'ciphertext-3',
      }),
    );

    await repository.update(
      created.recordDeliveryFailure(410, 'gone', new Date('2026-04-01T12:00:00.000Z')),
    );

    const stored = await repository.findById(created.id, '00000000-0000-4000-8000-000000000701');
    expect(stored?.lastFailureStatusCode).toBe(410);
    expect(stored?.lastFailureMessage).toBe('gone');

    await repository.delete(created.id, '00000000-0000-4000-8000-000000000701');

    await expect(
      repository.findById(created.id, '00000000-0000-4000-8000-000000000701'),
    ).resolves.toBeNull();
  });
});
