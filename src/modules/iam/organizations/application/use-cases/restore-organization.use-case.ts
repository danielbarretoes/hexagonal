/**
 * Restore Organization Use Case
 * Re-activates a previously soft-deleted tenant.
 */

import { Inject, Injectable } from '@nestjs/common';
import { Organization } from '../../domain/entities/organization.entity';
import type { OrganizationRepositoryPort } from '../../domain/ports/organization.repository.port';
import { ORGANIZATION_REPOSITORY_TOKEN } from '../ports/organization-repository.token';
import { OrganizationNotFoundException } from '../../../shared/domain/exceptions';

@Injectable()
export class RestoreOrganizationUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY_TOKEN)
    private readonly organizationRepository: OrganizationRepositoryPort,
  ) {}

  async execute(id: string): Promise<Organization> {
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
