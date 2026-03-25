/**
 * Get Organization By Id Use Case
 */

import { Inject, Injectable } from '@nestjs/common';
import { Organization } from '../../domain/entities/organization.entity';
import type { OrganizationRepositoryPort } from '../../domain/ports/organization.repository.port';
import { ORGANIZATION_REPOSITORY_TOKEN } from '../ports/organization-repository.token';

@Injectable()
export class GetOrganizationByIdUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY_TOKEN)
    private readonly organizationRepository: OrganizationRepositoryPort,
  ) {}

  async execute(id: string): Promise<Organization | null> {
    return this.organizationRepository.findById(id);
  }
}
