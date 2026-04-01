import { Client } from 'pg';
import { DataSource } from 'typeorm';
import {
  createTestPostgresClient,
  resetTestDatabase,
  RLS_RUNTIME_ROLE,
  useTestDatabaseEnvironment,
} from './support/test-database';

describe('Members RLS (e2e, PostgreSQL)', () => {
  let dataSource: DataSource;
  let client: Client;

  const userOneId = '1a8e31bb-cc0b-4110-9eb9-f6c0ed581a11';
  const userTwoId = '57888d52-c9f9-45f7-bbcc-91023f718818';
  const organizationOneId = 'dcdfaad6-652b-49ef-b6be-0879d41bb494';
  const organizationTwoId = 'd7d7d301-27c4-4819-9946-eaef0f0c8703';
  const memberOneId = 'b9860db0-d1ee-4e1e-9278-a26b366bfe52';
  const memberTwoId = '82696d9d-fba8-4acb-a4a6-aa4a9dcb9adf';
  const invitationOneId = 'f1ae4b2d-31ad-445f-93e5-8ac8c9be1b4a';
  const invitationTwoId = 'd68a5841-8959-4c08-8f46-eb6bdb4cc237';
  let ownerRoleId: string;
  let memberRoleId: string;

  beforeEach(async () => {
    useTestDatabaseEnvironment();
    dataSource = await resetTestDatabase();
    client = createTestPostgresClient();
    await client.connect();

    const roleRows: Array<{ id: string; code: string }> = await dataSource.query(
      `SELECT "id", "code" FROM "roles" WHERE "code" IN ('owner', 'member')`,
    );
    ownerRoleId = roleRows.find((row) => row.code === 'owner')?.id ?? '';
    memberRoleId = roleRows.find((row) => row.code === 'member')?.id ?? '';

    await dataSource.query(
      `
        INSERT INTO "users" ("id", "email", "password_hash", "first_name", "last_name")
        VALUES
          ($1, 'owner-one@example.com', 'hash', 'Owner', 'One'),
          ($2, 'owner-two@example.com', 'hash', 'Owner', 'Two')
      `,
      [userOneId, userTwoId],
    );

    await dataSource.query(
      `
        INSERT INTO "organizations" ("id", "name")
        VALUES
          ($1, 'Organization One'),
          ($2, 'Organization Two')
      `,
      [organizationOneId, organizationTwoId],
    );

    await dataSource.query(
      `
        INSERT INTO "members" ("id", "user_id", "organization_id", "role_id")
        VALUES
          ($1, $2, $3, $4),
          ($5, $6, $7, $8)
      `,
      [
        memberOneId,
        userOneId,
        organizationOneId,
        ownerRoleId,
        memberTwoId,
        userTwoId,
        organizationTwoId,
        memberRoleId,
      ],
    );

    await dataSource.query(
      `
        INSERT INTO "http_logs" ("id", "method", "path", "status_code", "duration_ms", "organization_id")
        VALUES
          ('b9ea273f-c671-4d2c-934d-3c73c95c31f1', 'GET', '/tenant-one', 200, 5, $1),
          ('6dfcb0d4-cff0-4874-a2d0-bda0c6cd0999', 'GET', '/tenant-two', 200, 5, $2)
      `,
      [organizationOneId, organizationTwoId],
    );

    await dataSource.query(
      `
        INSERT INTO "organization_invitations" ("id", "organization_id", "email", "role_id", "token_hash", "expires_at")
        VALUES
          ($1, $2, 'invite-one@example.com', $3, 'hash-one', NOW() + interval '7 days'),
          ($4, $5, 'invite-two@example.com', $6, 'hash-two', NOW() + interval '7 days')
      `,
      [
        invitationOneId,
        organizationOneId,
        memberRoleId,
        invitationTwoId,
        organizationTwoId,
        memberRoleId,
      ],
    );

    await client.query('RESET ROLE');
    await client.query(`SET ROLE ${RLS_RUNTIME_ROLE}`);
  });

  afterEach(async () => {
    await client.query('RESET ROLE');
    await client.query(`SELECT set_config('app.current_organization_id', '', false)`);
    await client.query(`SELECT set_config('app.current_invitation_id', '', false)`);
    await client.end();
    await dataSource.destroy();
  });

  it('hides tenant-scoped rows when no organization context is set', async () => {
    const result = await client.query('SELECT count(*)::int AS count FROM "members"');

    expect(result.rows[0].count).toBe(0);
  });

  it('returns only rows for the current tenant context', async () => {
    await client.query(`SELECT set_config('app.current_organization_id', $1, false)`, [
      organizationOneId,
    ]);

    const result = await client.query(
      'SELECT "organization_id", "user_id" FROM "members" ORDER BY "joined_at" ASC',
    );

    expect(result.rows).toEqual([
      {
        organization_id: organizationOneId,
        user_id: userOneId,
      },
    ]);
  });

  it('returns only http log rows for the current tenant context', async () => {
    await client.query(`SELECT set_config('app.current_organization_id', $1, false)`, [
      organizationOneId,
    ]);

    const result = await client.query(
      'SELECT "organization_id", "path" FROM "http_logs" ORDER BY "created_at" ASC',
    );

    expect(result.rows).toEqual([
      {
        organization_id: organizationOneId,
        path: '/tenant-one',
      },
    ]);
  });

  it('returns only invitation rows for the current tenant context', async () => {
    await client.query(`SELECT set_config('app.current_organization_id', $1, false)`, [
      organizationOneId,
    ]);

    const result = await client.query(
      'SELECT "organization_id", "email" FROM "organization_invitations" ORDER BY "created_at" ASC',
    );

    expect(result.rows).toEqual([
      {
        organization_id: organizationOneId,
        email: 'invite-one@example.com',
      },
    ]);
  });

  it('allows selecting an invitation by explicit invitation scope without tenant context', async () => {
    await client.query(`SELECT set_config('app.current_invitation_id', $1, false)`, [
      invitationOneId,
    ]);

    const result = await client.query(
      'SELECT "id", "organization_id" FROM "organization_invitations" WHERE "id" = $1',
      [invitationOneId],
    );

    expect(result.rows).toEqual([
      {
        id: invitationOneId,
        organization_id: organizationOneId,
      },
    ]);
  });

  it('rejects inserts into another tenant partition', async () => {
    await client.query(`SELECT set_config('app.current_organization_id', $1, false)`, [
      organizationOneId,
    ]);

    await expect(
      client.query(
        `
          INSERT INTO "members" ("id", "user_id", "organization_id", "role_id")
          VALUES ($1, $2, $3, $4)
        `,
        ['7f8ee6c8-9679-4d51-b54f-5cc8388ac4ab', userOneId, organizationTwoId, memberRoleId],
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it('rejects http log inserts into another tenant partition', async () => {
    await client.query(`SELECT set_config('app.current_organization_id', $1, false)`, [
      organizationOneId,
    ]);

    await expect(
      client.query(
        `
          INSERT INTO "http_logs" ("id", "method", "path", "status_code", "duration_ms", "organization_id")
          VALUES ($1, 'POST', '/forbidden', 201, 5, $2)
        `,
        ['d6f0d35c-28fc-46c4-b0fc-0d7b73685a92', organizationTwoId],
      ),
    ).rejects.toThrow(/row-level security/i);
  });
});
