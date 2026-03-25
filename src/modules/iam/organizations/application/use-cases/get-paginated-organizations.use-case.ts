/**
 * Get Paginated Organizations Use Case
 */

import { Inject, Injectable } from '@nestjs/common';
import { Paginated } from '../../../../../shared/domain/primitives/paginated';
import { Organization } from '../../domain/entities/organization.entity';
import type { OrganizationRepositoryPort } from '../../domain/ports/organization.repository.port';
import { ORGANIZATION_REPOSITORY_TOKEN } from '../ports/organization-repository.token';

@Injectable()
export class GetPaginatedOrganizationsUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY_TOKEN)
    private readonly organizationRepository: OrganizationRepositoryPort,
  ) {}

  async execute(page: number, limit: number): Promise<Paginated<Organization>> {
    return this.organizationRepository.findPaginated(page, limit);
  }
}
