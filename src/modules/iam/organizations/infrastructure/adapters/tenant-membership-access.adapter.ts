import { Inject, Injectable } from '@nestjs/common';
import { MEMBER_REPOSITORY_TOKEN } from '../../application/ports/member-repository.token';
import type { MemberRepositoryPort } from '../../domain/ports/member.repository.port';
import type { PermissionCode } from '../../../../../shared/domain/authorization/permission-codes';
import type { AuthorizationPort } from '../../../../../shared/domain/ports/authorization.port';

@Injectable()
export class TenantMembershipAccessAdapter implements AuthorizationPort {
  constructor(
    @Inject(MEMBER_REPOSITORY_TOKEN)
    private readonly memberRepository: MemberRepositoryPort,
  ) {}

  async hasTenantAccess(userId: string, organizationId: string): Promise<boolean> {
    const member = await this.memberRepository.findByUserAndOrganization(userId, organizationId);
    return Boolean(member);
  }

  async hasPermission(
    userId: string,
    organizationId: string,
    permissionCode: PermissionCode,
  ): Promise<boolean> {
    const member = await this.memberRepository.findByUserAndOrganization(userId, organizationId);

    if (!member) {
      return false;
    }

    return member.role.hasPermission(permissionCode);
  }
}
