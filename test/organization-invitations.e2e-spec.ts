import request from 'supertest';
import type { E2eTestContext } from './support/e2e-app';
import {
  createE2eTestApp,
  destroyE2eTestApp,
  resetE2eDatabase,
  waitForHttpLogsToDrain,
} from './support/e2e-app';
import { createOrganization, loginUser, selfRegisterUser } from './support/iam-fixtures';

interface MemberListItem {
  userId: string;
  role: string;
}

describe('Organization Invitations API (e2e, PostgreSQL)', () => {
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

  it('invites a user email into an organization and lets the invited user accept', async () => {
    await selfRegisterUser(context.app.getHttpServer(), {
      email: 'owner@example.com',
      firstName: 'Owner',
      lastName: 'User',
    }).expect(201);
    await selfRegisterUser(context.app.getHttpServer(), {
      email: 'invitee@example.com',
      firstName: 'Invitee',
      lastName: 'User',
    }).expect(201);

    const ownerLoginResponse = await loginUser(
      context.app.getHttpServer(),
      'owner@example.com',
    ).expect(200);
    const inviteeLoginResponse = await loginUser(
      context.app.getHttpServer(),
      'invitee@example.com',
    ).expect(200);

    const organizationResponse = await createOrganization(
      context.app.getHttpServer(),
      ownerLoginResponse.body.accessToken,
      'Acme',
    ).expect(201);
    const organizationId = organizationResponse.body.id as string;

    const invitationResponse = await request(context.app.getHttpServer())
      .post('/api/v1/organization-invitations')
      .set('Authorization', `Bearer ${ownerLoginResponse.body.accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        email: 'invitee@example.com',
        roleCode: 'member',
      })
      .expect(201);

    expect(invitationResponse.body.invitationToken).toEqual(expect.any(String));

    await request(context.app.getHttpServer())
      .post('/api/v1/organization-invitations/accept')
      .set('Authorization', `Bearer ${inviteeLoginResponse.body.accessToken}`)
      .send({
        token: invitationResponse.body.invitationToken,
      })
      .expect(204);

    const membersResponse = await request(context.app.getHttpServer())
      .get('/api/v1/members')
      .set('Authorization', `Bearer ${ownerLoginResponse.body.accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    const members = membersResponse.body as MemberListItem[];

    expect(
      members.some(
        (member) => member.userId === inviteeLoginResponse.body.userId && member.role === 'member',
      ),
    ).toBe(true);
  });
});
