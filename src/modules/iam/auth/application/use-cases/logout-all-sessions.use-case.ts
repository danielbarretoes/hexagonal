import { Inject, Injectable } from '@nestjs/common';
import { ADMIN_AUDIT_PORT } from '../../../../../shared/application/ports/admin-audit.token';
import type { AdminAuditPort } from '../../../../../shared/domain/ports/admin-audit.port';
import { AUTH_SESSION_REPOSITORY_TOKEN } from '../ports/auth-session-repository.token';
import type { AuthSessionRepositoryPort } from '../../domain/ports/auth-session.repository.port';

@Injectable()
export class LogoutAllSessionsUseCase {
  constructor(
    @Inject(AUTH_SESSION_REPOSITORY_TOKEN)
    private readonly authSessionRepository: AuthSessionRepositoryPort,
    @Inject(ADMIN_AUDIT_PORT)
    private readonly adminAuditPort: AdminAuditPort,
  ) {}

  async execute(userId: string): Promise<void> {
    await this.authSessionRepository.revokeAllActiveByUserId(userId);
    await this.adminAuditPort.record({
      action: 'iam.auth.sessions.revoked_all',
      actorUserId: userId,
      resourceType: 'auth_session',
      resourceId: null,
      payload: null,
    });
  }
}
