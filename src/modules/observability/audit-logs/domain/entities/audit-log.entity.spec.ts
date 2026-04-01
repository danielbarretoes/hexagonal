import { AuditLog } from './audit-log.entity';

describe('AuditLog', () => {
  it('creates an audit log with trimmed action and resource type', () => {
    const createdAt = new Date('2026-04-01T00:00:00.000Z');

    const auditLog = AuditLog.create({
      action: ' iam.member.added ',
      actorUserId: 'user-1',
      organizationId: 'org-1',
      resourceType: ' member ',
      resourceId: 'member-1',
      payload: { roleCode: 'member' },
      createdAt,
    });

    expect(auditLog.id).toEqual(expect.any(String));
    expect(auditLog.action).toBe('iam.member.added');
    expect(auditLog.resourceType).toBe('member');
    expect(auditLog.actorUserId).toBe('user-1');
    expect(auditLog.organizationId).toBe('org-1');
    expect(auditLog.resourceId).toBe('member-1');
    expect(auditLog.payload).toEqual({ roleCode: 'member' });
    expect(auditLog.createdAt).toBe(createdAt);
  });

  it('defaults createdAt when not provided', () => {
    const before = Date.now();
    const auditLog = AuditLog.create({
      action: 'iam.auth.session.revoked',
      actorUserId: null,
      organizationId: null,
      resourceType: 'auth_session',
      resourceId: null,
      payload: null,
    });

    expect(auditLog.createdAt.getTime()).toBeGreaterThanOrEqual(before);
  });
});
