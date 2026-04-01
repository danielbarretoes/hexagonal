import { CallHandler, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { TenantInterceptor } from './tenant.interceptor';
import { TenantContext } from './tenant-context';
import type { AuthorizationPort } from '../../shared/domain/ports/authorization.port';

describe('TenantInterceptor', () => {
  const hasTenantAccess = jest.fn();
  const authorizationPort: AuthorizationPort = {
    hasTenantAccess,
    hasPermission: jest.fn(),
  };

  const createContext = (request: Record<string, unknown>): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as ExecutionContext;

  const createHandler = (factory: () => ReturnType<typeof of>) =>
    ({
      handle: factory,
    }) as CallHandler;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens a tenant context for authenticated users with a validated organization', async () => {
    const interceptor = new TenantInterceptor(authorizationPort);
    hasTenantAccess.mockResolvedValue(true);

    const request = {
      headers: {
        'x-organization-id': 'org-1',
      },
      user: {
        userId: 'user-1',
        email: 'john@example.com',
      },
    };

    const next = createHandler(() =>
      of({
        organizationId: TenantContext.getOrganizationId(),
        userId: TenantContext.getUserId(),
      }),
    );

    const observable = await interceptor.intercept(createContext(request), next);
    await expect(
      new Promise((resolve, reject) => observable.subscribe({ next: resolve, error: reject })),
    ).resolves.toEqual({
      organizationId: 'org-1',
      userId: 'user-1',
    });

    expect(hasTenantAccess).toHaveBeenCalledWith('user-1', 'org-1');
    expect(request.effectiveOrganizationId).toBe('org-1');
  });

  it('reuses a previously validated effective organization id without rechecking access', async () => {
    const interceptor = new TenantInterceptor(authorizationPort);
    const request = {
      headers: {
        'x-organization-id': 'org-1',
      },
      effectiveOrganizationId: 'org-1',
      user: {
        userId: 'user-1',
        email: 'john@example.com',
      },
    };

    const next = createHandler(() =>
      of({
        organizationId: TenantContext.getOrganizationId(),
        userId: TenantContext.getUserId(),
      }),
    );

    const observable = await interceptor.intercept(createContext(request), next);
    await expect(
      new Promise((resolve, reject) => observable.subscribe({ next: resolve, error: reject })),
    ).resolves.toEqual({
      organizationId: 'org-1',
      userId: 'user-1',
    });

    expect(hasTenantAccess).not.toHaveBeenCalled();
  });

  it('opens a user-only context when no organization header is provided', async () => {
    const interceptor = new TenantInterceptor(authorizationPort);
    const request = {
      headers: {},
      user: {
        userId: 'user-1',
        email: 'john@example.com',
      },
    };

    const next = createHandler(() =>
      of({
        organizationId: TenantContext.getOrganizationId(),
        userId: TenantContext.getUserId(),
      }),
    );

    const observable = await interceptor.intercept(createContext(request), next);
    await expect(
      new Promise((resolve, reject) => observable.subscribe({ next: resolve, error: reject })),
    ).resolves.toEqual({
      organizationId: '',
      userId: 'user-1',
    });

    expect(hasTenantAccess).not.toHaveBeenCalled();
  });

  it('rejects authenticated requests with an invalid tenant context', async () => {
    const interceptor = new TenantInterceptor(authorizationPort);
    hasTenantAccess.mockResolvedValue(false);

    const request = {
      headers: {
        'x-organization-id': 'org-1',
      },
      user: {
        userId: 'user-1',
        email: 'john@example.com',
      },
    };

    await expect(
      interceptor.intercept(
        createContext(request),
        createHandler(() => of('ok')),
      ),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      interceptor.intercept(
        createContext(request),
        createHandler(() => of('ok')),
      ),
    ).rejects.toThrow('Invalid tenant context for authenticated user');
  });

  it('keeps the error channel intact inside the async tenant scope', async () => {
    const interceptor = new TenantInterceptor(authorizationPort);
    const request = {
      headers: {},
      user: {
        userId: 'user-1',
        email: 'john@example.com',
      },
    };

    const observable = await interceptor.intercept(
      createContext(request),
      createHandler(() =>
        throwError(() => new Error(`boom:${TenantContext.getUserId() ?? 'missing'}`)),
      ),
    );

    await expect(
      new Promise((resolve, reject) => observable.subscribe({ next: resolve, error: reject })),
    ).rejects.toThrow('boom:user-1');
  });
});
