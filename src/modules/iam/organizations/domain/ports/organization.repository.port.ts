/**
 * Organization Repository Port
 * Defines the interface for organization persistence.
 */

import { Organization, CreateOrganizationProps } from '../entities/organization.entity';
import { Paginated } from '../../../../../shared/domain/primitives/paginated';

export interface OrganizationQueryOptions {
  includeDeleted?: boolean;
}

export interface OrganizationRepositoryPort {
  findById(id: string, options?: OrganizationQueryOptions): Promise<Organization | null>;
  findByName(name: string, options?: OrganizationQueryOptions): Promise<Organization | null>;
  findPaginated(page: number, limit: number): Promise<Paginated<Organization>>;
  create(props: CreateOrganizationProps & { id: string }): Promise<Organization>;
  update(id: string, data: Partial<Organization>): Promise<Organization>;
  delete(id: string): Promise<void>;
  restore(id: string): Promise<Organization>;
}
