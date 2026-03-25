/**
 * Member Repository Port
 * Defines the interface for member persistence.
 */

import { Member } from '../entities/member.entity';
import { Paginated } from '../../../../../shared/domain/primitives/paginated';
import { MembershipRoleName } from '../value-objects/membership-role.value-object';

export interface MemberRepositoryPort {
  findById(id: string): Promise<Member | null>;
  findByUserAndOrganization(userId: string, organizationId: string): Promise<Member | null>;
  findByUser(userId: string): Promise<Member[]>;
  findByOrganization(organizationId: string): Promise<Member[]>;
  findPaginated(page: number, limit: number): Promise<Paginated<Member>>;
  create(data: {
    userId: string;
    organizationId: string;
    role: MembershipRoleName;
  }): Promise<Member>;
  update(id: string, data: { role?: MembershipRoleName }): Promise<Member>;
  delete(id: string): Promise<void>;
}
