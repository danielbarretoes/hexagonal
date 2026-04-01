/**
 * Restore Organization Use Case
 * Re-activates a previously soft-deleted tenant.
 */

import { Inject, Injectable } from '@nestjs/common';
import { Organization } from '../../domain/entities/organization.entity';
import type { OrganizationRepositoryPort } from '../../domain/ports/organization.repository.port';
import { ORGANIZATION_REPOSITORY_TOKEN } from '../ports/organization-repository.token';
import { OrganizationNotFoundException } from '../../../shared/domain/exceptions';
import { TenantOrganizationPolicy } from '../policies/tenant-organization-policy';

@Injectable()
export class RestoreOrganizationUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY_TOKEN)
    private readonly organizationRepository: OrganizationRepositoryPort,
    private readonly tenantOrganizationPolicy: TenantOrganizationPolicy,
  ) {}

  async execute(id: string, scopedOrganizationId: string): Promise<Organization> {
    this.tenantOrganizationPolicy.assertMatchesScope(id, scopedOrganizationId);
    const organization = await this.organizationRepository.findById(id, {
      includeDeleted: true,
    });

    if (!organization) {
      throw new OrganizationNotFoundException(id);
    }

    if (!organization.isDeleted) {
      return organization;
    }

    return this.organizationRepository.restore(id);
  }
}
