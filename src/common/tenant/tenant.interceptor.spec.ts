import { CallHandler, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, throwError } from 'rxjs';
import { TenantInterceptor } from './tenant.interceptor';
import { TenantContext } from './tenant-context';
import type { AuthorizationPort } from '../../shared/domain/ports/authorization.port';
import { TENANT_SCOPED_METADATA_KEY } from '../http/decorators/tenant-scoped.decorator';

describe('TenantInterceptor', () => {
  const hasTenantAccess = jest.fn();
  const authorizationPort: AuthorizationPort = {
    hasTenantAccess,
    hasPermission: jest.fn(),
  };

  const createContext = (request: Record<string, unknown>): ExecutionContext =>
    ({
      getClass: () => class TestController {},
      getHandler: () => function testHandler() {},
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

  const createTenantScopedContext = (request: Record<string, unknown>): ExecutionContext => {
    const handler = function tenantScopedHandler() {};
    const controller = class TenantScopedController {};
    Reflect.defineMetadata(TENANT_SCOPED_METADATA_KEY, true, handler);

    return {
      getClass: () => controller,
      getHandler: () => handler,
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;
  };

  it('opens a tenant context for authenticated users with a validated organization', async () => {
    const interceptor = new TenantInterceptor(new Reflector(), authorizationPort);
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
    const interceptor = new TenantInterceptor(new Reflector(), authorizationPort);
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
    const interceptor = new TenantInterceptor(new Reflector(), authorizationPort);
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
      organizationId: undefined,
      userId: 'user-1',
    });

    expect(hasTenantAccess).not.toHaveBeenCalled();
  });

  it('rejects authenticated requests with an invalid tenant context', async () => {
    const interceptor = new TenantInterceptor(new Reflector(), authorizationPort);
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
    const interceptor = new TenantInterceptor(new Reflector(), authorizationPort);
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

  it('requires a tenant id for tenant-scoped routes', async () => {
    const interceptor = new TenantInterceptor(new Reflector(), authorizationPort);
    const request = {
      headers: {},
      user: {
        userId: 'user-1',
        email: 'john@example.com',
        authMethod: 'jwt',
      },
    };

    await expect(
      interceptor.intercept(
        createTenantScopedContext(request),
        createHandler(() => of('ok')),
      ),
    ).rejects.toThrow('x-organization-id header is required for tenant-scoped routes');
  });

  it('validates and stores the tenant id for tenant-scoped JWT routes', async () => {
    const interceptor = new TenantInterceptor(new Reflector(), authorizationPort);
    hasTenantAccess.mockResolvedValue(true);
    const request = {
      headers: {
        'x-organization-id': 'org-1',
      },
      user: {
        userId: 'user-1',
        email: 'john@example.com',
        authMethod: 'jwt',
      },
    };

    const observable = await interceptor.intercept(
      createTenantScopedContext(request),
      createHandler(() =>
        of({
          organizationId: TenantContext.getOrganizationId(),
          userId: TenantContext.getUserId(),
        }),
      ),
    );

    await expect(
      new Promise((resolve, reject) => observable.subscribe({ next: resolve, error: reject })),
    ).resolves.toEqual({
      organizationId: 'org-1',
      userId: 'user-1',
    });

    expect(request.effectiveOrganizationId).toBe('org-1');
    expect(hasTenantAccess).toHaveBeenCalledWith('user-1', 'org-1');
  });
});
