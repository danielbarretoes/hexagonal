import type { PermissionCode } from '../authorization/permission-codes';

export interface AuthorizationPort {
  hasTenantAccess(userId: string, organizationId: string): Promise<boolean>;
  hasPermission(
    userId: string,
    organizationId: string,
    permissionCode: PermissionCode,
  ): Promise<boolean>;
}
