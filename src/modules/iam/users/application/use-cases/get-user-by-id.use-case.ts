/**
 * Get User By Id Use Case
 */

import { Inject, Injectable } from '@nestjs/common';
import { User } from '../../domain/entities/user.entity';
import type { UserRepositoryPort } from '../../domain/ports/user.repository.port';
import { USER_REPOSITORY_TOKEN } from '../ports/user-repository.token';
import type { MemberRepositoryPort } from '../../../organizations/domain/ports/member.repository.port';
import { MEMBER_REPOSITORY_TOKEN } from '../../../organizations/application/ports/member-repository.token';

@Injectable()
export class GetUserByIdUseCase {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: UserRepositoryPort,
    @Inject(MEMBER_REPOSITORY_TOKEN)
    private readonly memberRepository: MemberRepositoryPort,
  ) {}

  async execute(id: string, organizationId: string): Promise<User | null> {
    const membership = await this.memberRepository.findByUserAndOrganization(id, organizationId);

    if (!membership) {
      return null;
    }

    return this.userRepository.findById(id);
  }
}
