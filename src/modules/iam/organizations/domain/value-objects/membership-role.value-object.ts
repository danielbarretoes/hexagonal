/**
 * Membership role value object.
 * Wraps the persisted IAM role assigned to a tenant membership.
 */

import type { PermissionCode } from '../../../../../shared/domain/authorization/permission-codes';

export interface MembershipRoleSnapshot {
  id: string;
  code: string;
  permissions: readonly PermissionCode[];
}

export class MembershipRole {
  private constructor(private readonly snapshot: MembershipRoleSnapshot) {
    Object.freeze(this);
  }

  static create(snapshot: MembershipRoleSnapshot): MembershipRole {
    return new MembershipRole({
      ...snapshot,
      permissions: [...snapshot.permissions],
    });
  }

  get id(): string {
    return this.snapshot.id;
  }

  get name(): string {
    return this.snapshot.code;
  }

  get permissions(): readonly PermissionCode[] {
    return this.snapshot.permissions;
  }

  hasPermission(permissionCode: PermissionCode): boolean {
    return this.snapshot.permissions.includes(permissionCode);
  }

  hasAnyPermission(permissionCodes: readonly PermissionCode[]): boolean {
    return permissionCodes.some((permissionCode) => this.hasPermission(permissionCode));
  }
}
