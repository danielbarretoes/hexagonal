import { Inject, Injectable } from '@nestjs/common';
import { ADMIN_AUDIT_PORT } from '../../../../../shared/application/ports/admin-audit.token';
import type { AdminAuditPort } from '../../../../../shared/domain/ports/admin-audit.port';
import { MEMBER_REPOSITORY_TOKEN } from '../ports/member-repository.token';
import type { MemberRepositoryPort } from '../../domain/ports/member.repository.port';
import { MemberByIdNotFoundException } from '../../../shared/domain/exceptions';
import { TenantMembershipManagementPolicy } from '../policies/tenant-membership-management.policy';

export interface RemoveMemberCommand {
  memberId: string;
  organizationId: string;
  actorUserId?: string;
}

@Injectable()
export class RemoveMemberUseCase {
  constructor(
    @Inject(MEMBER_REPOSITORY_TOKEN)
    private readonly memberRepository: MemberRepositoryPort,
    @Inject(ADMIN_AUDIT_PORT)
    private readonly adminAuditPort: AdminAuditPort,
    private readonly tenantMembershipManagementPolicy: TenantMembershipManagementPolicy,
  ) {}

  async execute(command: RemoveMemberCommand): Promise<void> {
    const member = await this.memberRepository.findById(command.memberId);

    if (!member || member.organizationId !== command.organizationId) {
      throw new MemberByIdNotFoundException(command.memberId);
    }

    const organizationMembers = await this.memberRepository.findByOrganization(
      command.organizationId,
    );
    this.tenantMembershipManagementPolicy.assertMemberRemovalIsAllowed(member, organizationMembers);

    await this.memberRepository.delete(command.memberId);
    await this.adminAuditPort.record({
      action: 'iam.member.removed',
      actorUserId: command.actorUserId ?? null,
      organizationId: command.organizationId,
      resourceType: 'member',
      resourceId: member.id,
      payload: {
        targetUserId: member.userId,
        roleCode: member.role.name,
      },
    });
  }
}
