import { MembershipRole, MEMBERSHIP_ROLE_NAMES } from './membership-role.value-object';
import { InvalidMembershipRoleException } from '../../../shared/domain/exceptions';

describe('MembershipRole', () => {
  it('creates all supported roles', () => {
    for (const roleName of MEMBERSHIP_ROLE_NAMES) {
      const role = MembershipRole.create(roleName);
      expect(role.name).toBe(roleName);
    }
  });

  it('exposes permissions for owner', () => {
    const role = MembershipRole.create('owner');

    expect(role.can('canCreate')).toBe(true);
    expect(role.can('canDelete')).toBe(true);
  });

  it('rejects invalid roles', () => {
    expect(() => MembershipRole.create('super-admin')).toThrow(InvalidMembershipRoleException);
  });
});
