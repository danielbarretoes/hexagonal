/**
 * Member Repository Port
 * Defines the interface for member persistence.
 */

import { Member } from '../entities/member.entity';
import { Paginated } from '../../../../../shared/domain/primitives/paginated';

export interface MemberRepositoryPort {
  findById(id: string): Promise<Member | null>;
  findByUserAndOrganization(userId: string, organizationId: string): Promise<Member | null>;
  findByUser(userId: string): Promise<Member[]>;
  findByOrganization(organizationId: string): Promise<Member[]>;
  findPaginated(page: number, limit: number): Promise<Paginated<Member>>;
  create(data: { userId: string; organizationId: string; roleId: string }): Promise<Member>;
  update(id: string, data: { roleId?: string }): Promise<Member>;
  delete(id: string): Promise<void>;
}
