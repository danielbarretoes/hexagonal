/**
 * Member Mapper
 */

import { Member } from '../../../../domain/entities/member.entity';
import { MemberTypeOrmEntity } from '../entities/member.entity';
import { MembershipRole } from '../../../../domain/value-objects/membership-role.value-object';
import type { PermissionCode } from '../../../../../../../shared/domain/authorization/permission-codes';

export class MemberMapper {
  static toDomain(entity: MemberTypeOrmEntity): Member {
    return Member.rehydrate({
      id: entity.id,
      userId: entity.userId,
      organizationId: entity.organizationId,
      role: MembershipRole.create({
        id: entity.role.id,
        code: entity.role.code,
        permissions: entity.role.permissions.map((permission) => permission.code as PermissionCode),
      }),
      joinedAt: entity.joinedAt,
    });
  }
}
