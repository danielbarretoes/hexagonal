/**
 * User Mapper
 * Maps between User domain entity and TypeORM entity.
 */

import { User } from '../../../../domain/entities/user.entity';
import { UserTypeOrmEntity } from '../entities/user.entity';

export class UserMapper {
  static toDomain(entity: UserTypeOrmEntity): User {
    return User.rehydrate({
      id: entity.id,
      email: entity.email,
      passwordHash: entity.passwordHash,
      firstName: entity.firstName,
      lastName: entity.lastName,
      emailVerifiedAt: entity.emailVerifiedAt,
      deletedAt: entity.deletedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
