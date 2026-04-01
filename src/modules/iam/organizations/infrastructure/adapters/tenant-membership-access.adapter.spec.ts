import { TenantMembershipAccessAdapter } from './tenant-membership-access.adapter';
import { MembershipRole } from '../../domain/value-objects/membership-role.value-object';
import type { MemberRepositoryPort } from '../../domain/ports/member.repository.port';
import { PERMISSION_CODES } from '../../../../../shared/domain/authorization/permission-codes';

describe('TenantMembershipAccessAdapter', () => {
  const findByUserAndOrganization = jest.fn();
  const memberRepository: MemberRepositoryPort = {
    findById: jest.fn(),
    findByUserAndOrganization,
    findByUser: jest.fn(),
    findByOrganization: jest.fn(),
    findPaginated: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createRole = (permissionCodes: readonly string[]) =>
    MembershipRole.create({
      id: 'role-id',
      code: 'member',
      permissions: permissionCodes,
    });

  it('returns false when the user is not a member of the tenant', async () => {
    const adapter = new TenantMembershipAccessAdapter(memberRepository);
    findByUserAndOrganization.mockResolvedValue(null);

    await expect(adapter.hasTenantAccess('user-1', 'org-1')).resolves.toBe(false);
  });

  it('returns true for any membership when tenant access is requested', async () => {
    const adapter = new TenantMembershipAccessAdapter(memberRepository);
    findByUserAndOrganization.mockResolvedValue({
      role: createRole([]),
    });

    await expect(adapter.hasTenantAccess('user-1', 'org-1')).resolves.toBe(true);
  });

  it('returns true when the assigned role contains the requested permission', async () => {
    const adapter = new TenantMembershipAccessAdapter(memberRepository);
    findByUserAndOrganization.mockResolvedValue({
      role: createRole([PERMISSION_CODES.OBSERVABILITY_HTTP_LOGS_READ]),
    });

    await expect(
      adapter.hasPermission('user-1', 'org-1', PERMISSION_CODES.OBSERVABILITY_HTTP_LOGS_READ),
    ).resolves.toBe(true);
  });

  it('returns false when the assigned role does not contain the requested permission', async () => {
    const adapter = new TenantMembershipAccessAdapter(memberRepository);
    findByUserAndOrganization.mockResolvedValue({
      role: createRole([PERMISSION_CODES.IAM_ORGANIZATIONS_READ]),
    });

    await expect(
      adapter.hasPermission('user-1', 'org-1', PERMISSION_CODES.OBSERVABILITY_HTTP_LOGS_READ),
    ).resolves.toBe(false);
  });
});
