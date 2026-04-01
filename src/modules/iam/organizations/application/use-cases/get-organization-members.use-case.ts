import { Inject, Injectable } from '@nestjs/common';
import { MEMBER_REPOSITORY_TOKEN } from '../ports/member-repository.token';
import type { MemberRepositoryPort } from '../../domain/ports/member.repository.port';
import type { Member } from '../../domain/entities/member.entity';

@Injectable()
export class GetOrganizationMembersUseCase {
  constructor(
    @Inject(MEMBER_REPOSITORY_TOKEN)
    private readonly memberRepository: MemberRepositoryPort,
  ) {}

  async execute(organizationId: string): Promise<Member[]> {
    return this.memberRepository.findByOrganization(organizationId);
  }
}
