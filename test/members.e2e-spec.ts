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

interface MemberListItem {
  id: string;
  userId: string;
  role: string;
}

describe('Members API (e2e, PostgreSQL)', () => {
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

  it('adds members, changes roles, removes members, and protects the last owner', async () => {
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

    const addMemberResponse = await request(context.app.getHttpServer())
      .post('/api/v1/members')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .set('Idempotency-Key', createIdempotencyKey('member-add'))
      .send({
        userId: memberRegistration.body.id,
      })
      .expect(201);

    expect(addMemberResponse.body.userId).toBe(memberRegistration.body.id);
    expect(addMemberResponse.body.role).toBe('member');

    const listMembersResponse = await request(context.app.getHttpServer())
      .get('/api/v1/members')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    const members = listMembersResponse.body as MemberListItem[];

    expect(members).toHaveLength(2);

    const ownerMember = members.find((member) => member.userId === ownerRegistration.body.id);

    expect(ownerMember).toBeDefined();

    const updateRoleResponse = await request(context.app.getHttpServer())
      .patch(`/api/v1/members/${addMemberResponse.body.id}/role`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        roleCode: 'admin',
      })
      .expect(200);

    expect(updateRoleResponse.body.role).toBe('admin');

    await request(context.app.getHttpServer())
      .patch(`/api/v1/members/${ownerMember?.id}/role`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        roleCode: 'admin',
      })
      .expect(403);

    await request(context.app.getHttpServer())
      .delete(`/api/v1/members/${ownerMember?.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(403);

    await request(context.app.getHttpServer())
      .delete(`/api/v1/members/${addMemberResponse.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(204);

    const membersAfterRemoval = await request(context.app.getHttpServer())
      .get('/api/v1/members')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    expect(membersAfterRemoval.body).toHaveLength(1);
  });
});
