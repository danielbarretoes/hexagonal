import { RecordAuditLogUseCase } from './record-audit-log.use-case';
import type { AuditLogRepositoryPort } from '../../domain/ports/audit-log.repository.port';
import type { AuditLog } from '../../domain/entities/audit-log.entity';

describe('RecordAuditLogUseCase', () => {
  it('records normalized administrative audit entries', async () => {
    const create = jest
      .fn<Promise<AuditLog>, [AuditLog]>()
      .mockImplementation(async (auditLog) => auditLog);
    const repository: AuditLogRepositoryPort = { create };
    const useCase = new RecordAuditLogUseCase(repository);

    await useCase.record({
      action: ' iam.member.role_changed ',
      actorUserId: 'user-1',
      organizationId: 'org-1',
      resourceType: ' member ',
      resourceId: 'member-1',
      payload: { roleCode: 'admin' },
    });

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'iam.member.role_changed',
        actorUserId: 'user-1',
        organizationId: 'org-1',
        resourceType: 'member',
        resourceId: 'member-1',
        payload: { roleCode: 'admin' },
      }),
    );
  });

  it('fills nullable fields with null', async () => {
    const create = jest
      .fn<Promise<AuditLog>, [AuditLog]>()
      .mockImplementation(async (auditLog) => auditLog);
    const repository: AuditLogRepositoryPort = { create };
    const useCase = new RecordAuditLogUseCase(repository);

    await useCase.record({
      action: 'iam.auth.sessions.revoked_all',
      resourceType: 'auth_session',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: null,
        organizationId: null,
        resourceId: null,
        payload: null,
      }),
    );
  });
});
