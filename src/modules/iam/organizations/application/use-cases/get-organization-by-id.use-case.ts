/**
 * Get Organization By Id Use Case
 */

import { Inject, Injectable } from '@nestjs/common';
import { Organization } from '../../domain/entities/organization.entity';
import type { OrganizationRepositoryPort } from '../../domain/ports/organization.repository.port';
import { ORGANIZATION_REPOSITORY_TOKEN } from '../ports/organization-repository.token';
import { TenantOrganizationPolicy } from '../policies/tenant-organization-policy';

@Injectable()
export class GetOrganizationByIdUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY_TOKEN)
    private readonly organizationRepository: OrganizationRepositoryPort,
    private readonly tenantOrganizationPolicy: TenantOrganizationPolicy,
  ) {}

  async execute(id: string, scopedOrganizationId: string): Promise<Organization | null> {
    this.tenantOrganizationPolicy.assertMatchesScope(id, scopedOrganizationId);
    return this.organizationRepository.findById(id);
  }
}
