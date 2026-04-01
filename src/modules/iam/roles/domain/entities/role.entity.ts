import { Permission } from './permission.entity';
import type { PermissionCode } from '../../../../../shared/domain/authorization/permission-codes';

export class Role {
  public readonly id: string;
  public readonly code: string;
  public readonly name: string;
  public readonly isSystem: boolean;
  public readonly permissions: readonly Permission[];
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  private constructor(props: {
    id: string;
    code: string;
    name: string;
    isSystem: boolean;
    permissions: readonly Permission[];
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = props.id;
    this.code = props.code;
    this.name = props.name;
    this.isSystem = props.isSystem;
    this.permissions = props.permissions;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    Object.freeze(this);
  }

  static rehydrate(props: {
    id: string;
    code: string;
    name: string;
    isSystem: boolean;
    permissions: readonly Permission[];
    createdAt: Date;
    updatedAt: Date;
  }): Role {
    return new Role(props);
  }

  hasPermission(permissionCode: PermissionCode): boolean {
    return this.permissions.some((permission) => permission.code === permissionCode);
  }
}
