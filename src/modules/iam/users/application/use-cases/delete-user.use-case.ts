/**
 * Delete User Use Case
 * Performs a soft delete so identities remain auditable.
 */

import { Inject, Injectable } from '@nestjs/common';
import type { UserRepositoryPort } from '../../domain/ports/user.repository.port';
import { USER_REPOSITORY_TOKEN } from '../ports/user-repository.token';
import { UserNotFoundException } from '../../../shared/domain/exceptions';

@Injectable()
export class DeleteUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async execute(id: string): Promise<void> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new UserNotFoundException(id);
    }

    await this.userRepository.delete(id);
  }
}
