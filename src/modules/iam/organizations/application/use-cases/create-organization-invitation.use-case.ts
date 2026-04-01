import { Inject, Injectable } from '@nestjs/common';
import { ADMIN_AUDIT_PORT } from '../../../../../shared/application/ports/admin-audit.token';
import type { AdminAuditPort } from '../../../../../shared/domain/ports/admin-audit.port';
import { ORGANIZATION_INVITATION_REPOSITORY_TOKEN } from '../ports/organization-invitation-repository.token';
import type { OrganizationInvitationRepositoryPort } from '../../domain/ports/organization-invitation.repository.port';
import { ROLE_REPOSITORY_TOKEN } from '../../../roles/application/ports/role-repository.token';
import type { RoleRepositoryPort } from '../../../roles/domain/ports/role.repository.port';
import { ORGANIZATION_REPOSITORY_TOKEN } from '../ports/organization-repository.token';
import type { OrganizationRepositoryPort } from '../../domain/ports/organization.repository.port';
import { PASSWORD_HASHER_PORT } from '../../../shared/application/ports/password-hasher.token';
import type { PasswordHasherPort } from '../../../shared/domain/ports/password-hasher.port';
import { OrganizationInvitation } from '../../domain/entities/organization-invitation.entity';
import { createOpaqueToken } from '../../../../../shared/domain/security/opaque-token';
import { DEFAULT_ROLE_CODES } from '../../../shared/domain/authorization/default-role-codes';
import { MEMBER_REPOSITORY_TOKEN } from '../ports/member-repository.token';
import type { MemberRepositoryPort } from '../../domain/ports/member.repository.port';
import { USER_REPOSITORY_TOKEN } from '../../../users/application/ports/user-repository.token';
import type { UserRepositoryPort } from '../../../users/domain/ports/user.repository.port';
import { TRANSACTIONAL_EMAIL_PORT } from '../../../../../shared/application/ports/transactional-email.token';
import type { TransactionalEmailPort } from '../../../../../shared/domain/ports/transactional-email.port';
import {
  MemberAlreadyExistsException,
  OrganizationInvitationAlreadyExistsException,
  OrganizationNotFoundException,
  RoleNotFoundException,
} from '../../../shared/domain/exceptions';

export interface CreateOrganizationInvitationCommand {
  organizationId: string;
  email: string;
  roleCode?: string;
  actorUserId?: string;
}

export interface CreateOrganizationInvitationResponse {
  invitationToken: string;
}

@Injectable()
export class CreateOrganizationInvitationUseCase {
  constructor(
    @Inject(ORGANIZATION_INVITATION_REPOSITORY_TOKEN)
    private readonly invitationRepository: OrganizationInvitationRepositoryPort,
    @Inject(ROLE_REPOSITORY_TOKEN)
    private readonly roleRepository: RoleRepositoryPort,
    @Inject(ORGANIZATION_REPOSITORY_TOKEN)
    private readonly organizationRepository: OrganizationRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT)
    private readonly passwordHasher: PasswordHasherPort,
    @Inject(MEMBER_REPOSITORY_TOKEN)
    private readonly memberRepository: MemberRepositoryPort,
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: UserRepositoryPort,
    @Inject(ADMIN_AUDIT_PORT)
    private readonly adminAuditPort: AdminAuditPort,
    @Inject(TRANSACTIONAL_EMAIL_PORT)
    private readonly transactionalEmailPort: TransactionalEmailPort,
  ) {}

  async execute(
    command: CreateOrganizationInvitationCommand,
  ): Promise<CreateOrganizationInvitationResponse> {
    const roleCode = command.roleCode ?? DEFAULT_ROLE_CODES[3];
    const role = await this.roleRepository.findByCode(roleCode);

    if (!role) {
      throw new RoleNotFoundException(roleCode);
    }

    const existingUser = await this.userRepository.findByEmail(command.email);

    if (existingUser) {
      const existingMember = await this.memberRepository.findByUserAndOrganization(
        existingUser.id,
        command.organizationId,
      );

      if (existingMember) {
        throw new MemberAlreadyExistsException(existingUser.id, command.organizationId);
      }
    }

    const existingInvitation = await this.invitationRepository.findActiveByOrganizationAndEmail(
      command.organizationId,
      command.email,
    );

    if (existingInvitation?.isActive) {
      throw new OrganizationInvitationAlreadyExistsException(command.email, command.organizationId);
    }

    const opaqueToken = createOpaqueToken();
    const tokenHash = await this.passwordHasher.hash(opaqueToken.secret);
    const organization = await this.organizationRepository.findById(command.organizationId);

    if (!organization) {
      throw new OrganizationNotFoundException(command.organizationId);
    }

    const invitation = OrganizationInvitation.create({
      id: opaqueToken.id,
      organizationId: command.organizationId,
      email: command.email,
      roleId: role.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await this.invitationRepository.create(invitation);
    await this.adminAuditPort.record({
      action: 'iam.organization_invitation.created',
      actorUserId: command.actorUserId ?? null,
      organizationId: command.organizationId,
      resourceType: 'organization_invitation',
      resourceId: invitation.id,
      payload: {
        email: command.email,
        roleCode,
      },
    });
    await this.transactionalEmailPort.send({
      type: 'organization_invitation',
      to: command.email,
      organizationName: organization.name,
      roleCode,
      invitationToken: opaqueToken.token,
      expiresInDays: 7,
    });

    return {
      invitationToken: opaqueToken.token,
    };
  }
}
