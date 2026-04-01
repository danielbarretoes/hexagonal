import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from './permission.guard';
import { PERMISSION_CODES } from '../../../shared/domain/authorization/permission-codes';
import type { AuthorizationPort } from '../../../shared/domain/ports/authorization.port';
import { REQUIRED_PERMISSIONS_METADATA_KEY } from '../decorators/require-permissions.decorator';

describe('PermissionGuard', () => {
  const hasPermission = jest.fn();
  const authorizationPort: AuthorizationPort = {
    hasTenantAccess: jest.fn(),
    hasPermission,
  };
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;

  const createContext = (request: Record<string, unknown>): ExecutionContext =>
    ({
      getHandler: () => 'handler',
      getClass: () => 'class',
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows the request when no permissions are required', async () => {
    const guard = new PermissionGuard(reflector, authorizationPort);
    reflector.getAllAndOverride = jest.fn().mockReturnValue([]);

    await expect(guard.canActivate(createContext({ headers: {} }))).resolves.toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(REQUIRED_PERMISSIONS_METADATA_KEY, [
      'handler',
      'class',
    ]);
    expect(hasPermission).not.toHaveBeenCalled();
  });

  it('validates each required permission and stores the effective organization id', async () => {
    const guard = new PermissionGuard(reflector, authorizationPort);
    reflector.getAllAndOverride = jest
      .fn()
      .mockReturnValue([PERMISSION_CODES.IAM_USERS_READ, PERMISSION_CODES.IAM_USERS_WRITE]);
    hasPermission.mockResolvedValue(true);

    const request = {
      headers: {
        'x-organization-id': 'org-1',
      },
      user: {
        userId: 'user-1',
        email: 'owner@example.com',
      },
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(hasPermission).toHaveBeenNthCalledWith(
      1,
      'user-1',
      'org-1',
      PERMISSION_CODES.IAM_USERS_READ,
    );
    expect(hasPermission).toHaveBeenNthCalledWith(
      2,
      'user-1',
      'org-1',
      PERMISSION_CODES.IAM_USERS_WRITE,
    );
    expect(request.effectiveOrganizationId).toBe('org-1');
  });

  it('rejects access when the authenticated user is missing', async () => {
    const guard = new PermissionGuard(reflector, authorizationPort);
    reflector.getAllAndOverride = jest.fn().mockReturnValue([PERMISSION_CODES.IAM_USERS_READ]);

    await expect(
      guard.canActivate(
        createContext({
          headers: {
            'x-organization-id': 'org-1',
          },
        }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects access when the tenant header is missing', async () => {
    const guard = new PermissionGuard(reflector, authorizationPort);
    reflector.getAllAndOverride = jest.fn().mockReturnValue([PERMISSION_CODES.IAM_USERS_READ]);

    await expect(
      guard.canActivate(
        createContext({
          headers: {},
          user: {
            userId: 'user-1',
            email: 'owner@example.com',
          },
        }),
      ),
    ).rejects.toThrow('x-organization-id header is required for permission checks');
  });

  it('rejects access when a required permission is missing', async () => {
    const guard = new PermissionGuard(reflector, authorizationPort);
    reflector.getAllAndOverride = jest
      .fn()
      .mockReturnValue([PERMISSION_CODES.OBSERVABILITY_HTTP_LOGS_READ]);
    hasPermission.mockResolvedValue(false);

    await expect(
      guard.canActivate(
        createContext({
          headers: {
            'x-organization-id': 'org-1',
          },
          user: {
            userId: 'user-1',
            email: 'member@example.com',
          },
        }),
      ),
    ).rejects.toThrow('Missing required permission: observability.http_logs.read');
  });
});
