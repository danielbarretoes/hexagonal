import request from 'supertest';
import type { E2eTestContext } from './support/e2e-app';
import {
  createE2eTestApp,
  destroyE2eTestApp,
  resetE2eDatabase,
  waitForHttpLogsToDrain,
} from './support/e2e-app';
import { createOrganization, loginUser, selfRegisterUser } from './support/iam-fixtures';

describe('Organizations API (e2e, PostgreSQL)', () => {
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

  it('creates, lists, reads, renames, deletes, and restores organizations for the authenticated owner', async () => {
    await selfRegisterUser(context.app.getHttpServer(), {
      email: 'owner@example.com',
      firstName: 'Owner',
      lastName: 'User',
    }).expect(201);

    const loginResponse = await loginUser(context.app.getHttpServer(), 'owner@example.com').expect(
      200,
    );
    const accessToken = loginResponse.body.accessToken as string;

    const createOrganizationResponse = await createOrganization(
      context.app.getHttpServer(),
      accessToken,
      'Acme',
    ).expect(201);

    const organizationId = createOrganizationResponse.body.id as string;

    const organizationsResponse = await request(context.app.getHttpServer())
      .get('/api/v1/organizations?page=1&limit=10')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(organizationsResponse.body.meta.totalItems).toBe(1);
    expect(organizationsResponse.body.items[0].id).toBe(organizationId);

    const getOrganizationResponse = await request(context.app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    expect(getOrganizationResponse.body.name).toBe('Acme');

    const renameOrganizationResponse = await request(context.app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        name: 'Acme HQ',
      })
      .expect(200);

    expect(renameOrganizationResponse.body.name).toBe('Acme HQ');

    await request(context.app.getHttpServer())
      .delete(`/api/v1/organizations/${organizationId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(204);

    const paginatedAfterDelete = await request(context.app.getHttpServer())
      .get('/api/v1/organizations?page=1&limit=10')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(paginatedAfterDelete.body.meta.totalItems).toBe(0);

    const restoredOrganizationResponse = await request(context.app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/restore`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    expect(restoredOrganizationResponse.body.id).toBe(organizationId);
    expect(restoredOrganizationResponse.body.name).toBe('Acme HQ');
  });
});
