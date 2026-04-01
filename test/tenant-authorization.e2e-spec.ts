import request from 'supertest';
import type { E2eTestContext } from './support/e2e-app';
import {
  createE2eTestApp,
  destroyE2eTestApp,
  getRoleId,
  resetE2eDatabase,
  waitForHttpLogsToDrain,
} from './support/e2e-app';
import { createOrganization, loginUser, selfRegisterUser } from './support/iam-fixtures';

describe('Tenant Authorization API (e2e, PostgreSQL)', () => {
  let context: E2eTestContext;

  beforeAll(async () => {
    context = await createE2eTestApp();
  });

  beforeEach(async () => {
    await resetE2eDatabase(context);
  });

  afterEach(async () => {
    await waitForHttpLogsToDrain();
  });

  afterAll(async () => {
    await destroyE2eTestApp(context);
  });

  it('rejects missing tenant headers, missing permissions, and invalid tenant contexts', async () => {
    const ownerRegistrationResponse = await selfRegisterUser(context.app.getHttpServer(), {
      email: 'owner@example.com',
      firstName: 'Owner',
      lastName: 'User',
    }).expect(201);

    const guestRegistrationResponse = await selfRegisterUser(context.app.getHttpServer(), {
      email: 'guest@example.com',
      firstName: 'Guest',
      lastName: 'User',
    }).expect(201);

    expect(ownerRegistrationResponse.body.id).toEqual(expect.any(String));

    const ownerLoginResponse = await loginUser(
      context.app.getHttpServer(),
      'owner@example.com',
    ).expect(200);
    const guestLoginResponse = await loginUser(
      context.app.getHttpServer(),
      'guest@example.com',
    ).expect(200);

    const ownerAccessToken = ownerLoginResponse.body.accessToken as string;
    const guestAccessToken = guestLoginResponse.body.accessToken as string;
    const guestUserId = guestRegistrationResponse.body.id as string;

    const createOrganizationResponse = await createOrganization(
      context.app.getHttpServer(),
      ownerAccessToken,
      'Secure Tenant',
    ).expect(201);

    const organizationId = createOrganizationResponse.body.id as string;
    const guestRoleId = await getRoleId(context.dataSource, 'guest');

    await context.dataSource.query(
      `
        INSERT INTO "members" ("id", "user_id", "organization_id", "role_id")
        VALUES ($1, $2, $3, $4)
      `,
      ['7f225f0f-57a3-481a-8a21-8f86bdb15106', guestUserId, organizationId, guestRoleId],
    );

    await request(context.app.getHttpServer())
      .get('/api/v1/organizations?page=1&limit=10')
      .set('Authorization', `Bearer ${ownerAccessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    const missingTenantHeaderResponse = await request(context.app.getHttpServer())
      .get('/api/v1/http-logs?page=1&limit=10')
      .set('Authorization', `Bearer ${ownerAccessToken}`)
      .expect(403);

    expect(missingTenantHeaderResponse.body.detail).toBe(
      'x-organization-id header is required for permission checks',
    );

    const guestForbiddenResponse = await request(context.app.getHttpServer())
      .get('/api/v1/http-logs?page=1&limit=10')
      .set('Authorization', `Bearer ${guestAccessToken}`)
      .set('x-organization-id', organizationId)
      .expect(403);

    expect(guestForbiddenResponse.body.detail).toBe(
      'Missing required permission: observability.http_logs.read',
    );

    const invalidTenantId = '00000000-0000-4000-8000-000000000777';

    const invalidTenantResponse = await request(context.app.getHttpServer())
      .get('/api/v1/organizations?page=1&limit=10')
      .set('Authorization', `Bearer ${ownerAccessToken}`)
      .set('x-organization-id', invalidTenantId)
      .expect(403);

    expect(invalidTenantResponse.body.detail).toBe('Invalid tenant context for authenticated user');
  });
});
