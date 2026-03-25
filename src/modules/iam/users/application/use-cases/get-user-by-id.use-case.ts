/**
 * Get User By Id Use Case
 */

import { Inject, Injectable } from '@nestjs/common';
import { User } from '../../domain/entities/user.entity';
import type { UserRepositoryPort } from '../../domain/ports/user.repository.port';
import { USER_REPOSITORY_TOKEN } from '../ports/user-repository.token';

@Injectable()
export class GetUserByIdUseCase {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async execute(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }
}
