/**
 * Register User Use Case
 */

import { Inject, Injectable } from '@nestjs/common';
import { User, CreateUserProps } from '../../domain/entities/user.entity';
import type { UserRepositoryPort } from '../../domain/ports/user.repository.port';
import { USER_REPOSITORY_TOKEN } from '../ports/user-repository.token';
import { UserAlreadyExistsException } from '../../../shared/domain/exceptions';
import type { PasswordHasherPort } from '../../../shared/domain/ports/password-hasher.port';
import { PASSWORD_HASHER_PORT } from '../../../shared/application/ports/password-hasher.token';

export interface RegisterUserCommand {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: UserRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT)
    private readonly passwordHasher: PasswordHasherPort,
  ) {}

  async execute(command: RegisterUserCommand): Promise<User> {
    const existingUser = await this.userRepository.findByEmail(command.email, {
      includeDeleted: true,
    });

    if (existingUser) {
      throw new UserAlreadyExistsException(command.email);
    }

    const passwordHash = await this.passwordHasher.hash(command.password);

    const props: CreateUserProps & { id: string } = {
      id: crypto.randomUUID(),
      email: command.email,
      passwordHash,
      firstName: command.firstName,
      lastName: command.lastName,
    };

    return this.userRepository.create(props);
  }
}
