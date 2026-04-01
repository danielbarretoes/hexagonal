/**
 * Register User Use Case
 */

import { Inject, Injectable } from '@nestjs/common';
import { User, CreateUserProps } from '../../domain/entities/user.entity';
import type { UserRepositoryPort } from '../../domain/ports/user.repository.port';
import { USER_REPOSITORY_TOKEN } from '../ports/user-repository.token';
import { UserAlreadyExistsException } from '../../../shared/domain/exceptions';
import { TRANSACTIONAL_EMAIL_PORT } from '../../../../../shared/application/ports/transactional-email.token';
import type { PasswordHasherPort } from '../../../shared/domain/ports/password-hasher.port';
import { PASSWORD_HASHER_PORT } from '../../../shared/application/ports/password-hasher.token';
import type { TransactionalEmailPort } from '../../../../../shared/domain/ports/transactional-email.port';

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
    @Inject(TRANSACTIONAL_EMAIL_PORT)
    private readonly transactionalEmailPort: TransactionalEmailPort,
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

    const user = await this.userRepository.create(props);

    try {
      await this.transactionalEmailPort.send({
        type: 'welcome',
        to: user.email,
        recipientName: user.fullName,
      });
    } catch {
      // Welcome email is best-effort so registration remains the source of truth.
    }

    return user;
  }
}
