import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import {
  TYPEORM_RLS_RUNTIME_OPTIONS,
  type TypeormRlsRuntimeOptions,
} from '../../../../../../../common/infrastructure/database/typeorm/transaction/typeorm-rls-runtime-options.token';
import { HttpLogTypeOrmEntity } from '../entities/http-log.entity';
import type {
  FindHttpLogsFilters,
  HttpLogRepositoryPort,
} from '../../../../domain/ports/http-log.repository.port';
import type { HttpLog } from '../../../../domain/entities/http-log.entity';
import { HttpLogMapper } from '../mappers/http-log.mapper';
import { TenantContextRequiredException } from '../../../../../../../shared/domain/exceptions';
import { Paginated } from '../../../../../../../shared/domain/primitives/paginated';
import { TenantContext } from '../../../../../../../common/tenant/tenant-context';

@Injectable()
export class HttpLogTypeOrmRepository implements HttpLogRepositoryPort {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(HttpLogTypeOrmEntity)
    private readonly repository: Repository<HttpLogTypeOrmEntity>,
    @Inject(TYPEORM_RLS_RUNTIME_OPTIONS)
    private readonly typeormRlsRuntimeOptions: TypeormRlsRuntimeOptions,
  ) {}

  async save(log: HttpLog): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.query(`SET LOCAL ROLE ${this.typeormRlsRuntimeOptions.runtimeRole}`);
      await manager.query(`SELECT set_config('app.current_organization_id', $1, true)`, [
        log.organizationId ?? '',
      ]);

      const entity = HttpLogMapper.toPersistence(log);

      await manager.query(
        `
          INSERT INTO "http_logs" (
            "id",
            "method",
            "path",
            "status_code",
            "request_body",
            "query_params",
            "route_params",
            "response_body",
            "error_message",
            "error_trace",
            "duration_ms",
            "user_id",
            "organization_id",
            "trace_id",
            "created_at"
          ) VALUES (
            $1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9, $10, $11, $12, $13, $14, $15
          )
        `,
        [
          entity.id,
          entity.method,
          entity.path,
          entity.statusCode,
          entity.requestBody === null ? null : JSON.stringify(entity.requestBody),
          entity.queryParams === null ? null : JSON.stringify(entity.queryParams),
          entity.routeParams === null ? null : JSON.stringify(entity.routeParams),
          entity.responseBody === null ? null : JSON.stringify(entity.responseBody),
          entity.errorMessage,
          entity.errorTrace,
          entity.durationMs,
          entity.userId,
          entity.organizationId,
          entity.traceId,
          entity.createdAt,
        ],
      );
    });
  }

  private getRequiredOrganizationId(): string {
    const organizationId = TenantContext.getOrganizationId();

    if (!organizationId) {
      throw new TenantContextRequiredException('http_logs');
    }

    return organizationId;
  }

  private async runWithinTenantScope<T>(
    operation: (repository: Repository<HttpLogTypeOrmEntity>, organizationId: string) => Promise<T>,
  ): Promise<T> {
    const organizationId = this.getRequiredOrganizationId();

    return this.dataSource.transaction(async (manager) => {
      await manager.query(`SET LOCAL ROLE ${this.typeormRlsRuntimeOptions.runtimeRole}`);
      await manager.query(`SELECT set_config('app.current_organization_id', $1, true)`, [
        organizationId,
      ]);

      return operation(manager.getRepository(HttpLogTypeOrmEntity), organizationId);
    });
  }

  async findById(id: string): Promise<HttpLog | null> {
    const entity = await this.runWithinTenantScope((repository, organizationId) =>
      repository.findOne({
        where: {
          id,
          organizationId,
        },
      }),
    );

    return entity ? HttpLogMapper.toDomain(entity) : null;
  }

  async findByTraceId(traceId: string): Promise<HttpLog[]> {
    const entities = await this.runWithinTenantScope((repository, organizationId) =>
      repository.find({
        where: {
          traceId,
          organizationId,
        },
        order: {
          createdAt: 'ASC',
        },
      }),
    );

    return entities.map(HttpLogMapper.toDomain);
  }

  async findPaginated(
    page: number,
    limit: number,
    filters?: FindHttpLogsFilters,
  ): Promise<Paginated<HttpLog>> {
    const skip = (page - 1) * limit;
    const [entities, total] = await this.runWithinTenantScope((repository, organizationId) =>
      repository.findAndCount({
        where: this.buildWhere(organizationId, filters),
        skip,
        take: limit,
        order: {
          createdAt: 'DESC',
        },
      }),
    );

    return Paginated.create(entities.map(HttpLogMapper.toDomain), total, page, limit);
  }

  private buildWhere(
    organizationId: string,
    filters?: FindHttpLogsFilters,
  ): Record<string, unknown> {
    const where: Record<string, unknown> = {
      organizationId,
    };

    if (filters?.createdFrom && filters?.createdTo) {
      where.createdAt = Between(filters.createdFrom, filters.createdTo);
    } else if (filters?.createdFrom) {
      where.createdAt = MoreThanOrEqual(filters.createdFrom);
    } else if (filters?.createdTo) {
      where.createdAt = LessThanOrEqual(filters.createdTo);
    }

    if (filters?.statusFamily) {
      const [minStatusCode, maxStatusCode] = this.toStatusRange(filters.statusFamily);
      where.statusCode = Between(minStatusCode, maxStatusCode);
    }

    return where;
  }

  private toStatusRange(statusFamily: FindHttpLogsFilters['statusFamily']): [number, number] {
    switch (statusFamily) {
      case '2xx':
        return [200, 299];
      case '3xx':
        return [300, 399];
      case '4xx':
        return [400, 499];
      case '5xx':
        return [500, 599];
      default:
        return [100, 599];
    }
  }
}
