/**
 * Organization Mapper
 */

import { Organization } from '../../../../domain/entities/organization.entity';
import { OrganizationTypeOrmEntity } from '../entities/organization.entity';

export class OrganizationMapper {
  static toDomain(entity: OrganizationTypeOrmEntity): Organization {
    return Organization.rehydrate({
      id: entity.id,
      name: entity.name,
      deletedAt: entity.deletedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
