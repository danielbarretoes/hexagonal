/**
 * Organizations access module.
 * Exposes persistence and tenant access providers without exporting the full organizations feature module.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AUTHORIZATION_PORT } from '../../../shared/application/ports/authorization.token';
import { MEMBER_REPOSITORY_TOKEN } from './application/ports/member-repository.token';
import { ORGANIZATION_INVITATION_REPOSITORY_TOKEN } from './application/ports/organization-invitation-repository.token';
import { ORGANIZATION_REPOSITORY_TOKEN } from './application/ports/organization-repository.token';
import { TenantMembershipAccessAdapter } from './infrastructure/adapters/tenant-membership-access.adapter';
import { MemberTypeOrmEntity } from './infrastructure/persistence/typeorm/entities/member.entity';
import { OrganizationInvitationTypeOrmEntity } from './infrastructure/persistence/typeorm/entities/organization-invitation.entity';
import { OrganizationTypeOrmEntity } from './infrastructure/persistence/typeorm/entities/organization.entity';
import { OrganizationInvitationTypeOrmRepository } from './infrastructure/persistence/typeorm/repositories/organization-invitation.typeorm-repository';
import { MemberTypeOrmRepository } from './infrastructure/persistence/typeorm/repositories/member.typeorm-repository';
import { OrganizationTypeOrmRepository } from './infrastructure/persistence/typeorm/repositories/organization.typeorm-repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrganizationTypeOrmEntity,
      MemberTypeOrmEntity,
      OrganizationInvitationTypeOrmEntity,
    ]),
  ],
  providers: [
    { provide: ORGANIZATION_REPOSITORY_TOKEN, useClass: OrganizationTypeOrmRepository },
    { provide: MEMBER_REPOSITORY_TOKEN, useClass: MemberTypeOrmRepository },
    {
      provide: ORGANIZATION_INVITATION_REPOSITORY_TOKEN,
      useClass: OrganizationInvitationTypeOrmRepository,
    },
    { provide: AUTHORIZATION_PORT, useClass: TenantMembershipAccessAdapter },
    OrganizationTypeOrmRepository,
    MemberTypeOrmRepository,
    OrganizationInvitationTypeOrmRepository,
    TenantMembershipAccessAdapter,
  ],
  exports: [
    ORGANIZATION_REPOSITORY_TOKEN,
    MEMBER_REPOSITORY_TOKEN,
    ORGANIZATION_INVITATION_REPOSITORY_TOKEN,
    AUTHORIZATION_PORT,
  ],
})
export class OrganizationsAccessModule {}
