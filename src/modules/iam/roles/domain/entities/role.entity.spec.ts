import { Permission } from './permission.entity';
import { Role } from './role.entity';

describe('Role', () => {
  it('checks permission membership by code', () => {
    const role = Role.rehydrate({
      id: 'role-owner',
      code: 'owner',
      name: 'Owner',
      isSystem: true,
      permissions: [
        Permission.rehydrate({
          id: 'permission-1',
          code: 'observability.http_logs.read',
          description: 'Read tenant HTTP logs',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        }),
      ],
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(role.hasPermission('observability.http_logs.read')).toBe(true);
    expect(role.hasPermission('iam.users.write')).toBe(false);
  });
});
