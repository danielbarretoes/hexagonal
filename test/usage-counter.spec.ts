import { DataSource } from 'typeorm';
import type { TypeormRlsRuntimeOptions } from '../src/common/infrastructure/database/typeorm/transaction/typeorm-rls-runtime-options.token';
import { TypeormTransactionContext } from '../src/common/infrastructure/database/typeorm/transaction/typeorm-transaction.context';
import { UsageCounter } from '../src/modules/usage-metering/domain/entities/usage-counter.entity';
import { UsageCounterTypeOrmRepository } from '../src/modules/usage-metering/infrastructure/persistence/typeorm/repositories/usage-counter.typeorm-repository';
import { resetTestDatabase, useTestDatabaseEnvironment } from './support/test-database';

const rlsRuntimeOptions: TypeormRlsRuntimeOptions = {
  runtimeRole: 'hexagonal_app_runtime',
};

async function seedUsageDependencies(dataSource: DataSource): Promise<void> {
  await dataSource.query('INSERT INTO "organizations" ("id", "name") VALUES ($1, $2)', [
    '00000000-0000-4000-8000-000000000501',
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
      '00000000-0000-4000-8000-000000000502',
      'owner@example.com',
      'hash',
      'Owner',
      'User',
      new Date('2026-04-01T00:00:00.000Z'),
    ],
  );
  await dataSource.query(
    `
      INSERT INTO "api_keys" (
        "id",
        "organization_id",
        "owner_user_id",
        "name",
        "key_prefix",
        "secret_hash",
        "scopes",
        "expires_at",
        "last_used_at",
        "last_used_ip",
        "revoked_at"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11)
    `,
    [
      '00000000-0000-4000-8000-000000000503',
      '00000000-0000-4000-8000-000000000501',
      '00000000-0000-4000-8000-000000000502',
      'Primary key',
      'saas_live',
      'secret-hash',
      JSON.stringify(['projects.read']),
      null,
      null,
      null,
      null,
    ],
  );
}

describe('UsageCounterTypeOrmRepository (integration, PostgreSQL)', () => {
  let dataSource: DataSource;
  let repository: UsageCounterTypeOrmRepository;

  beforeAll(() => {
    jest.setTimeout(30000);
  });

  beforeEach(async () => {
    useTestDatabaseEnvironment();
    dataSource = await resetTestDatabase();
    repository = new UsageCounterTypeOrmRepository(dataSource as never, rlsRuntimeOptions);
    await seedUsageDependencies(dataSource);
  });

  afterEach(async () => {
    await dataSource?.destroy();
  });

  it('aggregates API key traffic by route and status code', async () => {
    await repository.increment(
      UsageCounter.create({
        metricKey: 'api_key.request',
        organizationId: '00000000-0000-4000-8000-000000000501',
        userId: '00000000-0000-4000-8000-000000000502',
        apiKeyId: '00000000-0000-4000-8000-000000000503',
        routeKey: 'GET /projects',
        statusCode: 200,
        occurredAt: new Date('2026-04-01T10:15:00.000Z'),
      }),
    );
    await repository.increment(
      UsageCounter.create({
        metricKey: 'api_key.request',
        organizationId: '00000000-0000-4000-8000-000000000501',
        userId: '00000000-0000-4000-8000-000000000502',
        apiKeyId: '00000000-0000-4000-8000-000000000503',
        routeKey: 'GET /projects',
        statusCode: 200,
        occurredAt: new Date('2026-04-01T10:25:00.000Z'),
      }),
    );

    const summary = await repository.getApiKeyRequestSummary(
      '00000000-0000-4000-8000-000000000501',
      new Date('2026-04-01T00:00:00.000Z'),
      10,
    );

    expect(summary).toEqual([
      expect.objectContaining({
        apiKeyId: '00000000-0000-4000-8000-000000000503',
        apiKeyName: 'Primary key',
        routeKey: 'GET /projects',
        statusCode: 200,
        totalCount: 2,
      }),
    ]);
  });

  it('reuses the active transaction manager when incrementing counters inside a transaction', async () => {
    await dataSource.transaction((manager) =>
      TypeormTransactionContext.run(manager, async () => {
        await repository.increment(
          UsageCounter.create({
            metricKey: 'api_key.request',
            organizationId: '00000000-0000-4000-8000-000000000501',
            userId: '00000000-0000-4000-8000-000000000502',
            apiKeyId: '00000000-0000-4000-8000-000000000503',
            routeKey: 'POST /projects',
            statusCode: 201,
            occurredAt: new Date('2026-04-01T11:05:00.000Z'),
          }),
        );
      }),
    );

    const summary = await repository.getApiKeyRequestSummary(
      '00000000-0000-4000-8000-000000000501',
      new Date('2026-04-01T00:00:00.000Z'),
      10,
    );

    expect(summary).toEqual([
      expect.objectContaining({
        routeKey: 'POST /projects',
        statusCode: 201,
        totalCount: 1,
      }),
    ]);
  });
});
