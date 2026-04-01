import { Inject, Injectable } from '@nestjs/common';
import { ADMIN_AUDIT_PORT } from '../../../../../shared/application/ports/admin-audit.token';
import type { AdminAuditPort } from '../../../../../shared/domain/ports/admin-audit.port';
import { AUTH_SESSION_REPOSITORY_TOKEN } from '../ports/auth-session-repository.token';
import type { AuthSessionRepositoryPort } from '../../domain/ports/auth-session.repository.port';
import { PASSWORD_HASHER_PORT } from '../../../shared/application/ports/password-hasher.token';
import type { PasswordHasherPort } from '../../../shared/domain/ports/password-hasher.port';
import { SessionNotFoundException } from '../../../shared/domain/exceptions';
import { parseOpaqueToken } from '../../../../../shared/domain/security/opaque-token';

@Injectable()
export class LogoutSessionUseCase {
  constructor(
    @Inject(AUTH_SESSION_REPOSITORY_TOKEN)
    private readonly authSessionRepository: AuthSessionRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT)
    private readonly passwordHasher: PasswordHasherPort,
    @Inject(ADMIN_AUDIT_PORT)
    private readonly adminAuditPort: AdminAuditPort,
  ) {}

  async execute(refreshToken: string): Promise<void> {
    const tokenParts = parseOpaqueToken(refreshToken);

    if (!tokenParts) {
      throw new SessionNotFoundException();
    }

    const session = await this.authSessionRepository.findById(tokenParts.id);

    if (!session || !session.isActive) {
      throw new SessionNotFoundException();
    }

    const tokenMatches = await this.passwordHasher.compare(
      tokenParts.secret,
      session.refreshTokenHash,
    );

    if (!tokenMatches) {
      throw new SessionNotFoundException();
    }

    await this.authSessionRepository.update(session.revoke());
    await this.adminAuditPort.record({
      action: 'iam.auth.session.revoked',
      actorUserId: session.userId,
      resourceType: 'auth_session',
      resourceId: session.id,
      payload: null,
    });
  }
}
