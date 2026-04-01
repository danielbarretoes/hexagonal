import { Injectable } from '@nestjs/common';
import { DEFAULT_ROLE_CODES } from '../../../shared/domain/authorization/default-role-codes';
import type { Member } from '../../domain/entities/member.entity';
import {
  LastOwnerRemovalNotAllowedException,
  LastOwnerRoleChangeNotAllowedException,
  MemberAlreadyExistsException,
} from '../../../shared/domain/exceptions';

@Injectable()
export class TenantMembershipManagementPolicy {
  assertMemberCanBeAdded(
    existingMember: Member | null,
    userId: string,
    organizationId: string,
  ): void {
    if (existingMember) {
      throw new MemberAlreadyExistsException(userId, organizationId);
    }
  }

  assertRoleChangeIsAllowed(
    targetMember: Member,
    nextRoleCode: string,
    organizationMembers: readonly Member[],
  ): void {
    if (
      targetMember.role.name !== DEFAULT_ROLE_CODES[0] ||
      nextRoleCode === DEFAULT_ROLE_CODES[0]
    ) {
      return;
    }

    const ownerCount = organizationMembers.filter(
      (member) => member.role.name === DEFAULT_ROLE_CODES[0],
    ).length;

    if (ownerCount <= 1) {
      throw new LastOwnerRoleChangeNotAllowedException(targetMember.organizationId);
    }
  }

  assertMemberRemovalIsAllowed(targetMember: Member, organizationMembers: readonly Member[]): void {
    if (targetMember.role.name !== DEFAULT_ROLE_CODES[0]) {
      return;
    }

    const ownerCount = organizationMembers.filter(
      (member) => member.role.name === DEFAULT_ROLE_CODES[0],
    ).length;

    if (ownerCount <= 1) {
      throw new LastOwnerRemovalNotAllowedException(targetMember.organizationId);
    }
  }
}
