import { Member } from '../../domain/entities/member.entity';
import { MembershipRole } from '../../domain/value-objects/membership-role.value-object';
import { TenantMembershipManagementPolicy } from './tenant-membership-management.policy';
import {
  LastOwnerRemovalNotAllowedException,
  LastOwnerRoleChangeNotAllowedException,
  MemberAlreadyExistsException,
} from '../../../shared/domain/exceptions';

function createMember(
  memberId: string,
  userId: string,
  organizationId: string,
  roleCode: string,
): Member {
  return Member.rehydrate({
    id: memberId,
    userId,
    organizationId,
    role: MembershipRole.create({
      id: `role-${roleCode}`,
      code: roleCode,
      permissions: ['iam.members.write'],
    }),
    joinedAt: new Date('2026-01-01T00:00:00.000Z'),
  });
}

describe('TenantMembershipManagementPolicy', () => {
  const policy = new TenantMembershipManagementPolicy();

  it('rejects duplicate memberships', () => {
    expect(() =>
      policy.assertMemberCanBeAdded(
        createMember('member-1', 'user-1', 'org-1', 'member'),
        'user-1',
        'org-1',
      ),
    ).toThrow(MemberAlreadyExistsException);
  });

  it('rejects changing the last owner to a non-owner role', () => {
    const owner = createMember('member-1', 'user-1', 'org-1', 'owner');

    expect(() => policy.assertRoleChangeIsAllowed(owner, 'admin', [owner])).toThrow(
      LastOwnerRoleChangeNotAllowedException,
    );
  });

  it('rejects removing the last owner', () => {
    const owner = createMember('member-1', 'user-1', 'org-1', 'owner');

    expect(() => policy.assertMemberRemovalIsAllowed(owner, [owner])).toThrow(
      LastOwnerRemovalNotAllowedException,
    );
  });
});
