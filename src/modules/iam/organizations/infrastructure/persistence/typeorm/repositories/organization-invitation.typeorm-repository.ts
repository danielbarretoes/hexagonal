import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { OrganizationInvitation } from '../../../../domain/entities/organization-invitation.entity';
import type { OrganizationInvitationRepositoryPort } from '../../../../domain/ports/organization-invitation.repository.port';
import { OrganizationInvitationTypeOrmEntity } from '../entities/organization-invitation.entity';
import { TenantContextRequiredException } from '../../../../../../../shared/domain/exceptions';

const RLS_RUNTIME_ROLE = process.env.DB_RLS_RUNTIME_ROLE || 'hexagonal_app_runtime';

@Injectable()
export class OrganizationInvitationTypeOrmRepository implements OrganizationInvitationRepositoryPort {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(OrganizationInvitationTypeOrmEntity)
    private readonly repository: Repository<OrganizationInvitationTypeOrmEntity>,
  ) {}

  async findById(id: string): Promise<OrganizationInvitation | null> {
    const entity = await this.dataSource.transaction(async (manager) => {
      await manager.query(`SET LOCAL ROLE ${RLS_RUNTIME_ROLE}`);
      await manager.query(`SELECT set_config('app.current_invitation_id', $1, true)`, [id]);

      return manager.getRepository(OrganizationInvitationTypeOrmEntity).findOne({
        where: { id },
      });
    });

    return entity ? this.toDomain(entity) : null;
  }

  private async runWithinTenantScope<T>(
    organizationId: string,
    operation: (repository: Repository<OrganizationInvitationTypeOrmEntity>) => Promise<T>,
  ): Promise<T> {
    if (!organizationId) {
      throw new TenantContextRequiredException('organization_invitations');
    }

    return this.dataSource.transaction(async (manager) => {
      await manager.query(`SET LOCAL ROLE ${RLS_RUNTIME_ROLE}`);
      await manager.query(`SELECT set_config('app.current_organization_id', $1, true)`, [
        organizationId,
      ]);

      return operation(manager.getRepository(OrganizationInvitationTypeOrmEntity));
    });
  }

  async findActiveByOrganizationAndEmail(
    organizationId: string,
    email: string,
  ): Promise<OrganizationInvitation | null> {
    const entity = await this.runWithinTenantScope(organizationId, (repository) =>
      repository.findOne({
        where: {
          organizationId,
          email: email.toLowerCase().trim(),
          acceptedAt: IsNull(),
        },
        order: {
          createdAt: 'DESC',
        },
      }),
    );

    return entity ? this.toDomain(entity) : null;
  }

  async create(invitation: OrganizationInvitation): Promise<OrganizationInvitation> {
    const saved = await this.runWithinTenantScope(invitation.organizationId, async (repository) => {
      const entity = repository.create({
        id: invitation.id,
        organizationId: invitation.organizationId,
        email: invitation.email,
        roleId: invitation.roleId,
        tokenHash: invitation.tokenHash,
        expiresAt: invitation.expiresAt,
        acceptedAt: invitation.acceptedAt,
        createdAt: invitation.createdAt,
      });

      return repository.save(entity);
    });

    return this.toDomain(saved);
  }

  async update(invitation: OrganizationInvitation): Promise<OrganizationInvitation> {
    const entity = await this.runWithinTenantScope(
      invitation.organizationId,
      async (repository) => {
        await repository.update(invitation.id, {
          acceptedAt: invitation.acceptedAt,
          expiresAt: invitation.expiresAt,
          tokenHash: invitation.tokenHash,
        });

        return repository.findOne({ where: { id: invitation.id } });
      },
    );

    return this.toDomain(entity as OrganizationInvitationTypeOrmEntity);
  }

  private toDomain(entity: OrganizationInvitationTypeOrmEntity): OrganizationInvitation {
    return OrganizationInvitation.rehydrate({
      id: entity.id,
      organizationId: entity.organizationId,
      email: entity.email,
      roleId: entity.roleId,
      tokenHash: entity.tokenHash,
      expiresAt: entity.expiresAt,
      acceptedAt: entity.acceptedAt,
      createdAt: entity.createdAt,
    });
  }
}
