/**
 * Create Organization Use Case
 */

import { Inject, Injectable } from '@nestjs/common';
import { Organization, CreateOrganizationProps } from '../../domain/entities/organization.entity';
import type { OrganizationRepositoryPort } from '../../domain/ports/organization.repository.port';
import { ORGANIZATION_REPOSITORY_TOKEN } from '../ports/organization-repository.token';
import { OrganizationAlreadyExistsException } from '../../../shared/domain/exceptions';

export interface CreateOrganizationCommand {
  name: string;
}

@Injectable()
export class CreateOrganizationUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY_TOKEN)
    private readonly organizationRepository: OrganizationRepositoryPort,
  ) {}

  async execute(command: CreateOrganizationCommand): Promise<Organization> {
    const existingOrganization = await this.organizationRepository.findByName(command.name, {
      includeDeleted: true,
    });

    if (existingOrganization) {
      throw new OrganizationAlreadyExistsException(command.name);
    }

    const props: CreateOrganizationProps & { id: string } = {
      id: crypto.randomUUID(),
      name: command.name,
    };

    return this.organizationRepository.create(props);
  }
}
