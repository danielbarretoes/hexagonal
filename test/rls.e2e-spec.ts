import { Client } from 'pg';
import { DataSource } from 'typeorm';
import {
  createTestPostgresClient,
  resetTestDatabase,
  RLS_RUNTIME_ROLE,
  truncateIamTables,
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

  beforeAll(async () => {
    useTestDatabaseEnvironment();
    dataSource = await resetTestDatabase();
    client = createTestPostgresClient();
    await client.connect();
  });

  beforeEach(async () => {
    await truncateIamTables(dataSource);

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
        INSERT INTO "members" ("id", "user_id", "organization_id", "role")
        VALUES
          ($1, $2, $3, 'owner'),
          ($4, $5, $6, 'member')
      `,
      [memberOneId, userOneId, organizationOneId, memberTwoId, userTwoId, organizationTwoId],
    );

    await client.query('RESET ROLE');
    await client.query(`SET ROLE ${RLS_RUNTIME_ROLE}`);
  });

  afterEach(async () => {
    await client.query('RESET ROLE');
    await client.query(`SELECT set_config('app.current_organization_id', '', false)`);
  });

  afterAll(async () => {
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

  it('rejects inserts into another tenant partition', async () => {
    await client.query(`SELECT set_config('app.current_organization_id', $1, false)`, [
      organizationOneId,
    ]);

    await expect(
      client.query(
        `
          INSERT INTO "members" ("id", "user_id", "organization_id", "role")
          VALUES ($1, $2, $3, 'member')
        `,
        ['7f8ee6c8-9679-4d51-b54f-5cc8388ac4ab', userOneId, organizationTwoId],
      ),
    ).rejects.toThrow(/row-level security/i);
  });
});
