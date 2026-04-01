import request from 'supertest';
import type { E2eTestContext } from './support/e2e-app';
import {
  createE2eTestApp,
  destroyE2eTestApp,
  resetE2eDatabase,
  waitForHttpLog,
  waitForHttpLogsToDrain,
} from './support/e2e-app';
import { createOrganization, loginUser, selfRegisterUser } from './support/iam-fixtures';

describe('HTTP Logs API (e2e, PostgreSQL)', () => {
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

  it('reads tenant-scoped http logs by id, trace id, and filters', async () => {
    await selfRegisterUser(context.app.getHttpServer(), {
      email: 'owner@example.com',
      firstName: 'Owner',
      lastName: 'User',
    }).expect(201);

    const loginResponse = await loginUser(context.app.getHttpServer(), 'owner@example.com').expect(
      200,
    );
    const accessToken = loginResponse.body.accessToken as string;

    const organizationResponse = await createOrganization(
      context.app.getHttpServer(),
      accessToken,
      'Acme',
    ).expect(201);
    const organizationId = organizationResponse.body.id as string;

    await request(context.app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    const scopedOrganizationLog = await waitForHttpLog(context.dataSource, {
      method: 'GET',
      path: `/api/v1/organizations/${organizationId}`,
      statusCode: 200,
      organizationId,
    });

    const httpLogByIdResponse = await request(context.app.getHttpServer())
      .get(`/api/v1/http-logs/${scopedOrganizationLog.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    expect(httpLogByIdResponse.body.id).toBe(scopedOrganizationLog.id);
    expect(httpLogByIdResponse.body.traceId).toBe(scopedOrganizationLog.traceId);

    const httpLogsByTraceIdResponse = await request(context.app.getHttpServer())
      .get(`/api/v1/http-logs/trace/${scopedOrganizationLog.traceId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    expect(httpLogsByTraceIdResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: scopedOrganizationLog.id,
          traceId: scopedOrganizationLog.traceId,
        }),
      ]),
    );

    const createdFrom = new Date(scopedOrganizationLog.createdAt.getTime() - 5_000).toISOString();
    const createdTo = new Date().toISOString();

    const httpLogs2xxResponse = await request(context.app.getHttpServer())
      .get(
        `/api/v1/http-logs?page=1&limit=50&createdFrom=${createdFrom}&createdTo=${createdTo}&statusFamily=2xx`,
      )
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    expect(httpLogs2xxResponse.body.meta.totalItems).toBeGreaterThan(0);
    expect(httpLogs2xxResponse.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: scopedOrganizationLog.id,
          statusCode: 200,
        }),
      ]),
    );

    const missingUserId = '00000000-0000-4000-8000-000000000999';

    await request(context.app.getHttpServer())
      .get(`/api/v1/users/${missingUserId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(404);

    await waitForHttpLog(context.dataSource, {
      method: 'GET',
      path: `/api/v1/users/${missingUserId}`,
      statusCode: 404,
      organizationId,
    });

    const httpLogs4xxResponse = await request(context.app.getHttpServer())
      .get(
        `/api/v1/http-logs?page=1&limit=50&createdFrom=${createdFrom}&createdTo=${new Date().toISOString()}&statusFamily=4xx`,
      )
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    expect(httpLogs4xxResponse.body.meta.totalItems).toBeGreaterThan(0);
    expect(
      (
        httpLogs4xxResponse.body.items as Array<{
          path: string;
          statusCode: number;
        }>
      ).some((item) => item.path === `/api/v1/users/${missingUserId}` && item.statusCode === 404),
    ).toBe(true);
  });
});
