import { Inject, Injectable } from '@nestjs/common';
import type { MemberRepositoryPort } from '../../../organizations/domain/ports/member.repository.port';
import { MEMBER_REPOSITORY_TOKEN } from '../../../organizations/application/ports/member-repository.token';
import {
  CannotManageOwnUserException,
  SharedUserIdentityManagementNotAllowedException,
  UserManagementTargetNotAllowedException,
} from '../../../shared/domain/exceptions';

@Injectable()
export class TenantUserManagementPolicy {
  constructor(
    @Inject(MEMBER_REPOSITORY_TOKEN)
    private readonly memberRepository: MemberRepositoryPort,
  ) {}

  async assertCanManageTargetUser(
    actorUserId: string,
    targetUserId: string,
    organizationId: string,
  ): Promise<void> {
    if (actorUserId === targetUserId) {
      throw new CannotManageOwnUserException(targetUserId);
    }

    const targetMembership = await this.memberRepository.findByUserAndOrganization(
      targetUserId,
      organizationId,
    );

    if (!targetMembership) {
      throw new UserManagementTargetNotAllowedException(targetUserId, organizationId);
    }

    const targetMemberships = await this.memberRepository.findByUser(targetUserId);
    const belongsToAnotherOrganization = targetMemberships.some(
      (membership) => membership.organizationId !== organizationId,
    );

    if (belongsToAnotherOrganization) {
      throw new SharedUserIdentityManagementNotAllowedException(targetUserId);
    }
  }
}
