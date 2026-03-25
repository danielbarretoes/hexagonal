/**
 * Tenant Context Tests
 */

import { TenantContext } from './tenant-context';

describe('TenantContext', () => {
  describe('run and getTenant', () => {
    it('should store and retrieve tenant info inside the async scope', () => {
      const tenantInfo = { organizationId: 'org-123', userId: 'user-456' };

      TenantContext.run(tenantInfo, () => {
        expect(TenantContext.getTenant()).toEqual(tenantInfo);
      });
    });

    it('should return undefined when no tenant set', () => {
      expect(TenantContext.getTenant()).toBeUndefined();
    });
  });

  describe('getOrganizationId', () => {
    it('should return organizationId from tenant', () => {
      TenantContext.run({ organizationId: 'org-123', userId: 'user-456' }, () => {
        expect(TenantContext.getOrganizationId()).toBe('org-123');
      });
    });

    it('should return undefined when no tenant set', () => {
      expect(TenantContext.getOrganizationId()).toBeUndefined();
    });

    it('should return empty string when organizationId is empty', () => {
      TenantContext.run({ organizationId: '', userId: 'user-456' }, () => {
        expect(TenantContext.getOrganizationId()).toBe('');
      });
    });
  });

  describe('getUserId', () => {
    it('should return userId from tenant', () => {
      TenantContext.run({ organizationId: 'org-123', userId: 'user-456' }, () => {
        expect(TenantContext.getUserId()).toBe('user-456');
      });
    });

    it('should return undefined when no tenant set', () => {
      expect(TenantContext.getUserId()).toBeUndefined();
    });
  });

  describe('context isolation', () => {
    it('should isolate tenant info per async context', async () => {
      const promise = TenantContext.run(
        { organizationId: 'org-main', userId: 'user-main' },
        () =>
          new Promise<void>((resolve) => {
            setTimeout(() => {
              expect(TenantContext.getOrganizationId()).toBe('org-main');
              resolve();
            }, 10);
          }),
      );

      await promise;
    });
  });
});
