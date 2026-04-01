/**
 * Get Paginated Users Use Case
 */

import { Inject, Injectable } from '@nestjs/common';
import { Paginated } from '../../../../../shared/domain/primitives/paginated';
import { User } from '../../domain/entities/user.entity';
import type { UserRepositoryPort } from '../../domain/ports/user.repository.port';
import { USER_REPOSITORY_TOKEN } from '../ports/user-repository.token';
import type { MemberRepositoryPort } from '../../../organizations/domain/ports/member.repository.port';
import { MEMBER_REPOSITORY_TOKEN } from '../../../organizations/application/ports/member-repository.token';

@Injectable()
export class GetPaginatedUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: UserRepositoryPort,
    @Inject(MEMBER_REPOSITORY_TOKEN)
    private readonly memberRepository: MemberRepositoryPort,
  ) {}

  async execute(organizationId: string, page: number, limit: number): Promise<Paginated<User>> {
    const memberships = await this.memberRepository.findByOrganization(organizationId);
    const userIds = memberships.map((membership) => membership.userId);
    const users = await this.userRepository.findManyByIds(userIds);
    const total = users.length;
    const start = (page - 1) * limit;
    const pagedUsers = users.slice(start, start + limit);

    return Paginated.create(pagedUsers, total, page, limit);
  }
}
