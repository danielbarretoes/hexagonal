import { PERMISSION_CODES } from '../../../../../shared/domain/authorization/permission-codes';
import { MembershipRole } from './membership-role.value-object';

describe('MembershipRole', () => {
  function createPersistedRole(permissionCodes: readonly string[]) {
    return {
      id: 'role-owner',
      code: 'owner',
      permissions: permissionCodes,
    };
  }

  it('wraps a persisted IAM role and exposes its permissions', () => {
    const role = MembershipRole.create(
      createPersistedRole([
        PERMISSION_CODES.IAM_USERS_READ,
        PERMISSION_CODES.OBSERVABILITY_HTTP_LOGS_READ,
      ]),
    );

    expect(role.id).toBe('role-owner');
    expect(role.name).toBe('owner');
    expect(role.permissions).toEqual([
      PERMISSION_CODES.IAM_USERS_READ,
      PERMISSION_CODES.OBSERVABILITY_HTTP_LOGS_READ,
    ]);
  });

  it('checks permissions by code', () => {
    const role = MembershipRole.create(
      createPersistedRole([PERMISSION_CODES.OBSERVABILITY_HTTP_LOGS_READ]),
    );

    expect(role.hasPermission(PERMISSION_CODES.OBSERVABILITY_HTTP_LOGS_READ)).toBe(true);
    expect(role.hasPermission(PERMISSION_CODES.IAM_USERS_WRITE)).toBe(false);
  });
});
