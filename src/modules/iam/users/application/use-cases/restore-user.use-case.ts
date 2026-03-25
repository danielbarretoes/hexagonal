/**
 * Restore User Use Case
 * Re-activates a previously soft-deleted identity.
 */

import { Inject, Injectable } from '@nestjs/common';
import { User } from '../../domain/entities/user.entity';
import type { UserRepositoryPort } from '../../domain/ports/user.repository.port';
import { USER_REPOSITORY_TOKEN } from '../ports/user-repository.token';
import { UserNotFoundException } from '../../../shared/domain/exceptions';

@Injectable()
export class RestoreUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async execute(id: string): Promise<User> {
    const user = await this.userRepository.findById(id, { includeDeleted: true });

    if (!user) {
      throw new UserNotFoundException(id);
    }

    if (!user.isDeleted) {
      return user;
    }

    return this.userRepository.restore(id);
  }
}
