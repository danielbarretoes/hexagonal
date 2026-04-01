/**
 * Delete Organization Use Case
 * Performs a soft delete so tenants remain auditable.
 */

import { Inject, Injectable } from '@nestjs/common';
import type { OrganizationRepositoryPort } from '../../domain/ports/organization.repository.port';
import { ORGANIZATION_REPOSITORY_TOKEN } from '../ports/organization-repository.token';
import { OrganizationNotFoundException } from '../../../shared/domain/exceptions';
import { TenantOrganizationPolicy } from '../policies/tenant-organization-policy';

@Injectable()
export class DeleteOrganizationUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY_TOKEN)
    private readonly organizationRepository: OrganizationRepositoryPort,
    private readonly tenantOrganizationPolicy: TenantOrganizationPolicy,
  ) {}

  async execute(id: string, scopedOrganizationId: string): Promise<void> {
    this.tenantOrganizationPolicy.assertMatchesScope(id, scopedOrganizationId);
    const organization = await this.organizationRepository.findById(id);

    if (!organization) {
      throw new OrganizationNotFoundException(id);
    }

    await this.organizationRepository.delete(id);
  }
}
