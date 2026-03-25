/**
 * Delete Organization Use Case
 * Performs a soft delete so tenants remain auditable.
 */

import { Inject, Injectable } from '@nestjs/common';
import type { OrganizationRepositoryPort } from '../../domain/ports/organization.repository.port';
import { ORGANIZATION_REPOSITORY_TOKEN } from '../ports/organization-repository.token';
import { OrganizationNotFoundException } from '../../../shared/domain/exceptions';

@Injectable()
export class DeleteOrganizationUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY_TOKEN)
    private readonly organizationRepository: OrganizationRepositoryPort,
  ) {}

  async execute(id: string): Promise<void> {
    const organization = await this.organizationRepository.findById(id);

    if (!organization) {
      throw new OrganizationNotFoundException(id);
    }

    await this.organizationRepository.delete(id);
  }
}
