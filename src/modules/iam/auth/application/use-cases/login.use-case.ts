/**
 * Login Use Case
 * Authenticates user and returns JWT token.
 */

import { Inject, Injectable } from '@nestjs/common';
import type { UserRepositoryPort } from '../../../users/domain/ports/user.repository.port';
import { USER_REPOSITORY_TOKEN } from '../../../users/application/ports/user-repository.token';
import { JWT_TOKEN_PORT } from '../ports/jwt-token.token';
import { PASSWORD_HASHER_PORT } from '../../../shared/application/ports/password-hasher.token';
import type { JwtTokenPort } from '../../domain/ports';
import type { PasswordHasherPort } from '../../../shared/domain/ports/password-hasher.port';
import { InvalidCredentialsException } from '../../../shared/domain/exceptions';

export interface LoginCommand {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  userId: string;
  email: string;
}

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: UserRepositoryPort,
    @Inject(JWT_TOKEN_PORT)
    private readonly jwtTokenPort: JwtTokenPort,
    @Inject(PASSWORD_HASHER_PORT)
    private readonly passwordHasher: PasswordHasherPort,
  ) {}

  async execute(command: LoginCommand): Promise<LoginResponse> {
    const user = await this.userRepository.findByEmail(command.email);

    if (!user) {
      throw new InvalidCredentialsException();
    }

    const isValidPassword = await this.passwordHasher.compare(command.password, user.passwordHash);

    if (!isValidPassword) {
      throw new InvalidCredentialsException();
    }

    const token = this.jwtTokenPort.generateToken({
      userId: user.id,
      email: user.email,
    });

    return {
      accessToken: token,
      userId: user.id,
      email: user.email,
    };
  }
}
