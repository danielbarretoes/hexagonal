/**
 * Member TypeORM Repository
 */

import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { MemberTypeOrmEntity } from '../entities/member.entity';
import { MemberRepositoryPort } from '../../../../domain/ports/member.repository.port';
import { MemberMapper } from '../mappers/member.mapper';
import type { Member } from '../../../../domain/entities/member.entity';
import { Paginated } from '../../../../../../../shared/domain/primitives/paginated';
import { TenantContext } from '../../../../../../../common/tenant/tenant-context';
import {
  MemberByIdNotFoundException,
  MemberNotFoundException,
} from '../../../../../shared/domain/exceptions';
import type { MembershipRoleName } from '../../../../domain/value-objects/membership-role.value-object';

const RLS_RUNTIME_ROLE = process.env.DB_RLS_RUNTIME_ROLE || 'hexagonal_app_runtime';

@Injectable()
export class MemberTypeOrmRepository implements MemberRepositoryPort {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(MemberTypeOrmEntity)
    private readonly repository: Repository<MemberTypeOrmEntity>,
  ) {}

  private withTenantScope<T extends Record<string, string>>(baseWhere: T): T {
    const organizationId = TenantContext.getOrganizationId();

    if (!organizationId) {
      return baseWhere;
    }

    return {
      ...baseWhere,
      organizationId,
    };
  }

  private async runWithinTenantScope<T>(
    operation: (repository: Repository<MemberTypeOrmEntity>) => Promise<T>,
    organizationIdOverride?: string,
  ): Promise<T> {
    const organizationId = organizationIdOverride || TenantContext.getOrganizationId();

    if (!organizationId) {
      return operation(this.repository);
    }

    return this.dataSource.transaction(async (manager) => {
      await manager.query(`SET LOCAL ROLE ${RLS_RUNTIME_ROLE}`);
      await manager.query(`SELECT set_config('app.current_organization_id', $1, true)`, [
        organizationId,
      ]);

      return operation(manager.getRepository(MemberTypeOrmEntity));
    });
  }

  async findById(id: string): Promise<Member | null> {
    const entity = await this.runWithinTenantScope((repository) =>
      repository.findOne({
        where: this.withTenantScope({ id }),
        relations: ['user', 'organization'],
      }),
    );
    return entity ? MemberMapper.toDomain(entity) : null;
  }

  async findByUserAndOrganization(userId: string, organizationId: string): Promise<Member | null> {
    const entity = await this.runWithinTenantScope(
      (repository) =>
        repository.findOne({
          where: this.withTenantScope({ userId, organizationId }),
          relations: ['user', 'organization'],
        }),
      organizationId,
    );
    return entity ? MemberMapper.toDomain(entity) : null;
  }

  async findByUser(userId: string): Promise<Member[]> {
    const entities = await this.runWithinTenantScope((repository) =>
      repository.find({
        where: this.withTenantScope({ userId }),
        relations: ['user', 'organization'],
      }),
    );
    return entities.map(MemberMapper.toDomain);
  }

  async findByOrganization(organizationId: string): Promise<Member[]> {
    const entities = await this.runWithinTenantScope(
      (repository) =>
        repository.find({
          where: this.withTenantScope({ organizationId }),
          relations: ['user', 'organization'],
        }),
      organizationId,
    );
    return entities.map(MemberMapper.toDomain);
  }

  async findPaginated(page: number, limit: number): Promise<Paginated<Member>> {
    const skip = (page - 1) * limit;
    const [entities, total] = await this.runWithinTenantScope((repository) =>
      repository.findAndCount({
        where: this.withTenantScope({}),
        skip,
        take: limit,
        order: { joinedAt: 'DESC' },
        relations: ['user', 'organization'],
      }),
    );
    return Paginated.create(entities.map(MemberMapper.toDomain), total, page, limit);
  }

  async create(data: {
    userId: string;
    organizationId: string;
    role: MembershipRoleName;
  }): Promise<Member> {
    const fullEntity = await this.runWithinTenantScope(async (repository) => {
      const entity = repository.create({
        id: crypto.randomUUID(),
        userId: data.userId,
        organizationId: data.organizationId,
        role: data.role,
      });
      const saved = await repository.save(entity);
      return repository.findOne({
        where: { id: saved.id },
        relations: ['user', 'organization'],
      });
    }, data.organizationId);

    if (!fullEntity) {
      throw new MemberNotFoundException(data.userId, data.organizationId);
    }
    return MemberMapper.toDomain(fullEntity);
  }

  async update(id: string, data: { role?: MembershipRoleName }): Promise<Member> {
    const entity = await this.runWithinTenantScope(async (repository) => {
      await repository.update(id, { role: data.role });
      return repository.findOne({
        where: this.withTenantScope({ id }),
        relations: ['user', 'organization'],
      });
    });

    if (!entity) {
      throw new MemberByIdNotFoundException(id);
    }

    return MemberMapper.toDomain(entity);
  }

  async delete(id: string): Promise<void> {
    await this.runWithinTenantScope(async (repository) => {
      await repository.delete(id);
    });
  }
}
