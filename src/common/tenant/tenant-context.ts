/**
 * Tenant Context
 * Stores tenant (organization) information in AsyncLocalStorage.
 * Provides request-level isolation for multi-tenant applications.
 */

import { AsyncLocalStorage } from 'async_hooks';

export interface TenantInfo {
  userId: string;
  organizationId?: string;
}

export class TenantContext {
  private static storage = new AsyncLocalStorage<TenantInfo | undefined>();

  static run<T>(info: TenantInfo | undefined, callback: () => T): T {
    return this.storage.run(info, callback);
  }

  static getTenant(): TenantInfo | undefined {
    return this.storage.getStore();
  }

  static getOrganizationId(): string | undefined {
    return this.storage.getStore()?.organizationId;
  }

  static getUserId(): string | undefined {
    return this.storage.getStore()?.userId;
  }

  static clear(): void {
    this.storage.disable();
  }
}
