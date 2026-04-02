import request from 'supertest';
import type { E2eTestContext } from './support/e2e-app';
import {
  createE2eTestApp,
  destroyE2eTestApp,
  resetE2eDatabase,
  waitForHttpLogsToDrain,
} from './support/e2e-app';
import {
  createIdempotencyKey,
  createOrganization,
  loginUser,
  selfRegisterUser,
} from './support/iam-fixtures';

describe('Audit Trail API (e2e, PostgreSQL)', () => {
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

  it('records administrative membership changes in audit_logs', async () => {
    const ownerRegistration = await selfRegisterUser(context.app.getHttpServer(), {
      email: 'owner@example.com',
      firstName: 'Owner',
      lastName: 'User',
    }).expect(201);
    const memberRegistration = await selfRegisterUser(context.app.getHttpServer(), {
      email: 'member@example.com',
      firstName: 'Member',
      lastName: 'User',
    }).expect(201);

    const ownerLoginResponse = await loginUser(
      context.app.getHttpServer(),
      'owner@example.com',
    ).expect(200);
    const organizationResponse = await createOrganization(
      context.app.getHttpServer(),
      ownerLoginResponse.body.accessToken,
      'Acme',
    ).expect(201);

    await request(context.app.getHttpServer())
      .post('/api/v1/members')
      .set('Authorization', `Bearer ${ownerLoginResponse.body.accessToken}`)
      .set('x-organization-id', organizationResponse.body.id as string)
      .set('Idempotency-Key', createIdempotencyKey('audit-member-add'))
      .send({
        userId: memberRegistration.body.id,
        roleCode: 'member',
      })
      .expect(201);

    const auditRows = await context.dataSource.query(
      `
        SELECT "action", "actor_user_id", "organization_id", "resource_type", "payload"
        FROM "audit_logs"
        WHERE "action" = 'iam.member.added'
      `,
    );

    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]).toMatchObject({
      action: 'iam.member.added',
      actor_user_id: ownerRegistration.body.id,
      organization_id: organizationResponse.body.id,
      resource_type: 'member',
      payload: {
        roleCode: 'member',
        targetUserId: memberRegistration.body.id,
      },
    });
  });

  it('records session revocation actions in audit_logs', async () => {
    const registrationResponse = await selfRegisterUser(context.app.getHttpServer(), {
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
    }).expect(201);

    const loginResponse = await loginUser(context.app.getHttpServer(), 'john@example.com').expect(
      200,
    );

    await request(context.app.getHttpServer())
      .post('/api/v1/auth/logout')
      .send({
        refreshToken: loginResponse.body.refreshToken,
      })
      .expect(204);

    const auditRows = await context.dataSource.query(
      `
        SELECT "action", "actor_user_id", "resource_type", "resource_id"
        FROM "audit_logs"
        WHERE "action" = 'iam.auth.session.revoked'
      `,
    );

    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]).toMatchObject({
      action: 'iam.auth.session.revoked',
      actor_user_id: registrationResponse.body.id,
      resource_type: 'auth_session',
    });
    expect(auditRows[0].resource_id).toEqual(expect.any(String));
  });
});
