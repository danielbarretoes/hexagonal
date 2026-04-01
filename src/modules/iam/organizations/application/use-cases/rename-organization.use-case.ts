import { Inject, Injectable } from '@nestjs/common';
import { Organization } from '../../domain/entities/organization.entity';
import type { OrganizationRepositoryPort } from '../../domain/ports/organization.repository.port';
import { ORGANIZATION_REPOSITORY_TOKEN } from '../ports/organization-repository.token';
import {
  OrganizationAlreadyExistsException,
  OrganizationNotFoundException,
} from '../../../shared/domain/exceptions';
import { TenantOrganizationPolicy } from '../policies/tenant-organization-policy';

export interface RenameOrganizationCommand {
  organizationId: string;
  scopedOrganizationId: string;
  name: string;
}

@Injectable()
export class RenameOrganizationUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY_TOKEN)
    private readonly organizationRepository: OrganizationRepositoryPort,
    private readonly tenantOrganizationPolicy: TenantOrganizationPolicy,
  ) {}

  async execute(command: RenameOrganizationCommand): Promise<Organization> {
    this.tenantOrganizationPolicy.assertMatchesScope(
      command.organizationId,
      command.scopedOrganizationId,
    );

    const organization = await this.organizationRepository.findById(command.organizationId);

    if (!organization) {
      throw new OrganizationNotFoundException(command.organizationId);
    }

    const renamedOrganization = organization.updateName(command.name);
    const conflictingOrganization = await this.organizationRepository.findByName(
      renamedOrganization.name,
      {
        includeDeleted: true,
      },
    );

    if (conflictingOrganization && conflictingOrganization.id !== organization.id) {
      throw new OrganizationAlreadyExistsException(renamedOrganization.name);
    }

    return this.organizationRepository.update(organization.id, renamedOrganization);
  }
}
