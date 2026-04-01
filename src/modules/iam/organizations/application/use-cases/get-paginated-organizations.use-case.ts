/**
 * Get Paginated Organizations Use Case
 */

import { Inject, Injectable } from '@nestjs/common';
import { Paginated } from '../../../../../shared/domain/primitives/paginated';
import { Organization } from '../../domain/entities/organization.entity';
import type { OrganizationRepositoryPort } from '../../domain/ports/organization.repository.port';
import { ORGANIZATION_REPOSITORY_TOKEN } from '../ports/organization-repository.token';
import type { MemberRepositoryPort } from '../../domain/ports/member.repository.port';
import { MEMBER_REPOSITORY_TOKEN } from '../ports/member-repository.token';

@Injectable()
export class GetPaginatedOrganizationsUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY_TOKEN)
    private readonly organizationRepository: OrganizationRepositoryPort,
    @Inject(MEMBER_REPOSITORY_TOKEN)
    private readonly memberRepository: MemberRepositoryPort,
  ) {}

  async execute(userId: string, page: number, limit: number): Promise<Paginated<Organization>> {
    const memberships = await this.memberRepository.findByUser(userId);
    const organizationIds = memberships.map((membership) => membership.organizationId);
    const organizations = await this.organizationRepository.findManyByIds(organizationIds);
    const total = organizations.length;
    const start = (page - 1) * limit;
    const pagedOrganizations = organizations.slice(start, start + limit);

    return Paginated.create(pagedOrganizations, total, page, limit);
  }
}
