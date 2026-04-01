import { Permission } from '../../../../domain/entities/permission.entity';
import { Role } from '../../../../domain/entities/role.entity';
import { RoleTypeOrmEntity } from '../entities/role.entity';

export class RoleMapper {
  static toDomain(entity: RoleTypeOrmEntity): Role {
    return Role.rehydrate({
      id: entity.id,
      code: entity.code,
      name: entity.name,
      isSystem: entity.isSystem,
      permissions: entity.permissions.map((permission) =>
        Permission.rehydrate({
          id: permission.id,
          code: permission.code,
          description: permission.description,
          createdAt: permission.createdAt,
          updatedAt: permission.updatedAt,
        }),
      ),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
