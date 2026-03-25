/**
 * Get Paginated Users Use Case
 */

import { Inject, Injectable } from '@nestjs/common';
import { Paginated } from '../../../../../shared/domain/primitives/paginated';
import { User } from '../../domain/entities/user.entity';
import type { UserRepositoryPort } from '../../domain/ports/user.repository.port';
import { USER_REPOSITORY_TOKEN } from '../ports/user-repository.token';

@Injectable()
export class GetPaginatedUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async execute(page: number, limit: number): Promise<Paginated<User>> {
    return this.userRepository.findPaginated(page, limit);
  }
}
