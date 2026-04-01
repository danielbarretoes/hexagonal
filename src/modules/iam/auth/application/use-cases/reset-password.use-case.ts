import { Inject, Injectable } from '@nestjs/common';
import { USER_ACTION_TOKEN_REPOSITORY_TOKEN } from '../ports/user-action-token-repository.token';
import type { UserActionTokenRepositoryPort } from '../../domain/ports/user-action-token.repository.port';
import { PASSWORD_HASHER_PORT } from '../../../shared/application/ports/password-hasher.token';
import type { PasswordHasherPort } from '../../../shared/domain/ports/password-hasher.port';
import { USER_REPOSITORY_TOKEN } from '../../../users/application/ports/user-repository.token';
import type { UserRepositoryPort } from '../../../users/domain/ports/user.repository.port';
import {
  ActionTokenNotFoundException,
  UserNotFoundException,
} from '../../../shared/domain/exceptions';
import { parseOpaqueToken } from '../../../../../shared/domain/security/opaque-token';

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject(USER_ACTION_TOKEN_REPOSITORY_TOKEN)
    private readonly userActionTokenRepository: UserActionTokenRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT)
    private readonly passwordHasher: PasswordHasherPort,
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async execute(token: string, newPassword: string): Promise<void> {
    const tokenParts = parseOpaqueToken(token);

    if (!tokenParts) {
      throw new ActionTokenNotFoundException('password reset');
    }

    const actionToken = await this.userActionTokenRepository.findById(tokenParts.id);

    if (!actionToken || actionToken.purpose !== 'password_reset' || !actionToken.isActive) {
      throw new ActionTokenNotFoundException('password reset');
    }

    const tokenMatches = await this.passwordHasher.compare(
      tokenParts.secret,
      actionToken.tokenHash,
    );

    if (!tokenMatches) {
      throw new ActionTokenNotFoundException('password reset');
    }

    const user = await this.userRepository.findById(actionToken.userId, {
      includeDeleted: true,
    });

    if (!user) {
      throw new UserNotFoundException(actionToken.userId);
    }

    const passwordHash = await this.passwordHasher.hash(newPassword);
    await this.userRepository.update(user.id, user.updatePassword(passwordHash));
    await this.userActionTokenRepository.update(actionToken.consume());
  }
}
