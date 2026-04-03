import { DataSource } from 'typeorm';
import type { TypeormRlsRuntimeOptions } from '../src/common/infrastructure/database/typeorm/transaction/typeorm-rls-runtime-options.token';
import { TenantContext } from '../src/common/tenant/tenant-context';
import { HttpLog } from '../src/modules/observability/http-logs/domain/entities/http-log.entity';
import { HttpLogTypeOrmRepository } from '../src/modules/observability/http-logs/infrastructure/persistence/typeorm/repositories/http-log.typeorm-repository';
import { resetTestDatabase, useTestDatabaseEnvironment } from './support/test-database';

const rlsRuntimeOptions: TypeormRlsRuntimeOptions = {
  runtimeRole: 'hexagonal_app_runtime',
};

describe('HttpLogTypeOrmRepository (integration, PostgreSQL)', () => {
  let dataSource: DataSource;
  let repository: HttpLogTypeOrmRepository;

  beforeAll(() => {
    jest.setTimeout(30000);
  });

  beforeEach(async () => {
    useTestDatabaseEnvironment();
    dataSource = await resetTestDatabase();
    repository = new HttpLogTypeOrmRepository(dataSource as never, {} as never, rlsRuntimeOptions);
  });

  afterEach(async () => {
    TenantContext.clear();
    await dataSource?.destroy();
  });

  it('stores logs and reads them back within the active tenant scope', async () => {
    const firstLog = HttpLog.create({
      method: 'get',
      path: '/projects',
      statusCode: 200,
      requestBody: { page: 1 },
      queryParams: { page: 1 },
      routeParams: null,
      responseBody: { ok: true },
      errorMessage: null,
      errorTrace: null,
      durationMs: 18,
      userId: '00000000-0000-4000-8000-000000000601',
      organizationId: '00000000-0000-4000-8000-000000000602',
      traceId: 'trace-1',
      createdAt: new Date('2026-04-01T10:00:00.000Z'),
    });
    const secondLog = HttpLog.create({
      method: 'post',
      path: '/projects',
      statusCode: 503,
      requestBody: { name: 'Acme' },
      queryParams: null,
      routeParams: null,
      responseBody: null,
      errorMessage: 'temporary outage',
      errorTrace: 'stack',
      durationMs: 42,
      userId: '00000000-0000-4000-8000-000000000601',
      organizationId: '00000000-0000-4000-8000-000000000602',
      traceId: 'trace-1',
      createdAt: new Date('2026-04-01T11:00:00.000Z'),
    });
    const foreignTenantLog = HttpLog.create({
      method: 'get',
      path: '/foreign',
      statusCode: 200,
      requestBody: null,
      queryParams: null,
      routeParams: null,
      responseBody: { ok: true },
      errorMessage: null,
      errorTrace: null,
      durationMs: 8,
      userId: '00000000-0000-4000-8000-000000000603',
      organizationId: '00000000-0000-4000-8000-000000000604',
      traceId: 'trace-2',
      createdAt: new Date('2026-04-01T12:00:00.000Z'),
    });

    await repository.save(firstLog);
    await repository.save(secondLog);
    await repository.save(foreignTenantLog);

    await TenantContext.run(
      {
        userId: 'user-1',
        organizationId: '00000000-0000-4000-8000-000000000602',
      },
      async () => {
        const stored = await repository.findById(firstLog.id);
        const byTraceId = await repository.findByTraceId('trace-1');
        const paginated = await repository.findPaginated(1, 10, {
          statusFamily: '5xx',
          createdFrom: new Date('2026-04-01T00:00:00.000Z'),
          createdTo: new Date('2026-04-02T00:00:00.000Z'),
        });

        expect(stored?.path).toBe('/projects');
        expect(byTraceId).toHaveLength(2);
        expect(
          byTraceId.every((log) => log.organizationId === '00000000-0000-4000-8000-000000000602'),
        ).toBe(true);
        expect(paginated.items).toHaveLength(1);
        expect(paginated.items[0]?.statusCode).toBe(503);
        expect(paginated.meta.totalItems).toBe(1);
      },
    );
  });

  it('fails closed when tenant-scoped read access is attempted without a tenant context', async () => {
    await expect(repository.findByTraceId('trace-1')).rejects.toThrow('Tenant context is required');
    await expect(repository.findPaginated(1, 10)).rejects.toThrow('Tenant context is required');
  });
});
