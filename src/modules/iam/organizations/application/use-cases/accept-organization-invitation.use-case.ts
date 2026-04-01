import { Inject, Injectable } from '@nestjs/common';
import { ADMIN_AUDIT_PORT } from '../../../../../shared/application/ports/admin-audit.token';
import type { AdminAuditPort } from '../../../../../shared/domain/ports/admin-audit.port';
import { ORGANIZATION_INVITATION_REPOSITORY_TOKEN } from '../ports/organization-invitation-repository.token';
import type { OrganizationInvitationRepositoryPort } from '../../domain/ports/organization-invitation.repository.port';
import { USER_REPOSITORY_TOKEN } from '../../../users/application/ports/user-repository.token';
import type { UserRepositoryPort } from '../../../users/domain/ports/user.repository.port';
import { PASSWORD_HASHER_PORT } from '../../../shared/application/ports/password-hasher.token';
import type { PasswordHasherPort } from '../../../shared/domain/ports/password-hasher.port';
import { MEMBER_REPOSITORY_TOKEN } from '../ports/member-repository.token';
import type { MemberRepositoryPort } from '../../domain/ports/member.repository.port';
import {
  InvitationEmailMismatchException,
  MemberAlreadyExistsException,
  OrganizationInvitationNotFoundException,
  UserNotFoundException,
} from '../../../shared/domain/exceptions';
import { parseOpaqueToken } from '../../../../../shared/domain/security/opaque-token';

@Injectable()
export class AcceptOrganizationInvitationUseCase {
  constructor(
    @Inject(ORGANIZATION_INVITATION_REPOSITORY_TOKEN)
    private readonly invitationRepository: OrganizationInvitationRepositoryPort,
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: UserRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT)
    private readonly passwordHasher: PasswordHasherPort,
    @Inject(MEMBER_REPOSITORY_TOKEN)
    private readonly memberRepository: MemberRepositoryPort,
    @Inject(ADMIN_AUDIT_PORT)
    private readonly adminAuditPort: AdminAuditPort,
  ) {}

  async execute(token: string, userId: string): Promise<void> {
    const tokenParts = parseOpaqueToken(token);

    if (!tokenParts) {
      throw new OrganizationInvitationNotFoundException();
    }

    const invitation = await this.invitationRepository.findById(tokenParts.id);

    if (!invitation || !invitation.isActive) {
      throw new OrganizationInvitationNotFoundException();
    }

    const tokenMatches = await this.passwordHasher.compare(tokenParts.secret, invitation.tokenHash);

    if (!tokenMatches) {
      throw new OrganizationInvitationNotFoundException();
    }

    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new UserNotFoundException(userId);
    }

    if (user.email !== invitation.email) {
      throw new InvitationEmailMismatchException(invitation.email);
    }

    const existingMember = await this.memberRepository.findByUserAndOrganization(
      user.id,
      invitation.organizationId,
    );

    if (existingMember) {
      throw new MemberAlreadyExistsException(user.id, invitation.organizationId);
    }

    const member = await this.memberRepository.create({
      userId: user.id,
      organizationId: invitation.organizationId,
      roleId: invitation.roleId,
    });
    await this.invitationRepository.update(invitation.accept());
    await this.adminAuditPort.record({
      action: 'iam.organization_invitation.accepted',
      actorUserId: user.id,
      organizationId: invitation.organizationId,
      resourceType: 'organization_invitation',
      resourceId: invitation.id,
      payload: {
        memberId: member.id,
        email: invitation.email,
      },
    });
  }
}
