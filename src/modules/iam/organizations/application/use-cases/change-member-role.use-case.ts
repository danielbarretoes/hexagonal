import { Inject, Injectable } from '@nestjs/common';
import { ADMIN_AUDIT_PORT } from '../../../../../shared/application/ports/admin-audit.token';
import type { AdminAuditPort } from '../../../../../shared/domain/ports/admin-audit.port';
import { ROLE_REPOSITORY_TOKEN } from '../../../roles/application/ports/role-repository.token';
import type { RoleRepositoryPort } from '../../../roles/domain/ports/role.repository.port';
import { MEMBER_REPOSITORY_TOKEN } from '../ports/member-repository.token';
import type { MemberRepositoryPort } from '../../domain/ports/member.repository.port';
import type { Member } from '../../domain/entities/member.entity';
import {
  MemberByIdNotFoundException,
  RoleNotFoundException,
} from '../../../shared/domain/exceptions';
import { TenantMembershipManagementPolicy } from '../policies/tenant-membership-management.policy';

export interface ChangeMemberRoleCommand {
  memberId: string;
  organizationId: string;
  roleCode: string;
  actorUserId?: string;
}

@Injectable()
export class ChangeMemberRoleUseCase {
  constructor(
    @Inject(MEMBER_REPOSITORY_TOKEN)
    private readonly memberRepository: MemberRepositoryPort,
    @Inject(ROLE_REPOSITORY_TOKEN)
    private readonly roleRepository: RoleRepositoryPort,
    @Inject(ADMIN_AUDIT_PORT)
    private readonly adminAuditPort: AdminAuditPort,
    private readonly tenantMembershipManagementPolicy: TenantMembershipManagementPolicy,
  ) {}

  async execute(command: ChangeMemberRoleCommand): Promise<Member> {
    const member = await this.memberRepository.findById(command.memberId);

    if (!member || member.organizationId !== command.organizationId) {
      throw new MemberByIdNotFoundException(command.memberId);
    }

    const role = await this.roleRepository.findByCode(command.roleCode);

    if (!role) {
      throw new RoleNotFoundException(command.roleCode);
    }

    const organizationMembers = await this.memberRepository.findByOrganization(
      command.organizationId,
    );
    this.tenantMembershipManagementPolicy.assertRoleChangeIsAllowed(
      member,
      command.roleCode,
      organizationMembers,
    );

    if (member.role.id === role.id) {
      return member;
    }

    const updatedMember = await this.memberRepository.update(command.memberId, { roleId: role.id });

    await this.adminAuditPort.record({
      action: 'iam.member.role_changed',
      actorUserId: command.actorUserId ?? null,
      organizationId: command.organizationId,
      resourceType: 'member',
      resourceId: updatedMember.id,
      payload: {
        targetUserId: updatedMember.userId,
        roleCode: command.roleCode,
      },
    });

    return updatedMember;
  }
}
