/**
 * Member Mapper
 */

import { Member } from '../../../../domain/entities/member.entity';
import { MemberTypeOrmEntity } from '../entities/member.entity';
import { MembershipRole } from '../../../../domain/value-objects/membership-role.value-object';

export class MemberMapper {
  static toDomain(entity: MemberTypeOrmEntity): Member {
    return Member.rehydrate({
      id: entity.id,
      userId: entity.userId,
      organizationId: entity.organizationId,
      role: MembershipRole.create(entity.role),
      joinedAt: entity.joinedAt,
    });
  }
}
