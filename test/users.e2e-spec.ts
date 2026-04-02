import request from 'supertest';
import { UserTypeOrmEntity } from '../src/modules/iam/users/infrastructure/persistence/typeorm/entities/user.entity';
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
  createTenantUser,
  loginUser,
  selfRegisterUser,
} from './support/iam-fixtures';

describe('Users API (e2e, PostgreSQL)', () => {
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

  it('creates, lists, updates, deletes, and restores tenant-scoped users', async () => {
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

    const createManagedUserResponse = await createTenantUser(
      context.app.getHttpServer(),
      accessToken,
      organizationId,
      {
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
      },
    ).expect(201);

    const managedUserId = createManagedUserResponse.body.id as string;
    expect(createManagedUserResponse.body.email).toBe('jane@example.com');

    const getUserResponse = await request(context.app.getHttpServer())
      .get(`/api/v1/users/${managedUserId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    expect(getUserResponse.body.id).toBe(managedUserId);
    expect(getUserResponse.body.email).toBe('jane@example.com');

    const paginatedUsersResponse = await request(context.app.getHttpServer())
      .get('/api/v1/users?page=1&limit=10')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    expect(paginatedUsersResponse.body.meta.totalItems).toBe(2);
    expect(
      (paginatedUsersResponse.body.items as Array<{ email: string }>).map((item) => item.email),
    ).toEqual(['jane@example.com', 'owner@example.com']);

    const updateUserResponse = await request(context.app.getHttpServer())
      .patch(`/api/v1/users/${managedUserId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        firstName: 'Janet',
        lastName: 'Stone',
      })
      .expect(200);

    expect(updateUserResponse.body.fullName).toBe('Janet Stone');

    await request(context.app.getHttpServer())
      .delete(`/api/v1/users/${managedUserId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(204);

    const persistedUser = await context.dataSource.getRepository(UserTypeOrmEntity).findOne({
      where: { id: managedUserId },
      withDeleted: true,
    });

    expect(persistedUser?.deletedAt).toBeInstanceOf(Date);

    await request(context.app.getHttpServer())
      .get(`/api/v1/users/${managedUserId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(404);

    await loginUser(context.app.getHttpServer(), 'jane@example.com').expect(401);

    const restoreResponse = await request(context.app.getHttpServer())
      .patch(`/api/v1/users/${managedUserId}/restore`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    expect(restoreResponse.body.id).toBe(managedUserId);

    await loginUser(context.app.getHttpServer(), 'jane@example.com').expect(200);
  });

  it('blocks tenant-scoped profile mutations for users shared across organizations', async () => {
    await selfRegisterUser(context.app.getHttpServer(), {
      email: 'owner@example.com',
      firstName: 'Owner',
      lastName: 'User',
    }).expect(201);

    const loginResponse = await loginUser(context.app.getHttpServer(), 'owner@example.com').expect(
      200,
    );
    const accessToken = loginResponse.body.accessToken as string;

    const firstOrganizationResponse = await createOrganization(
      context.app.getHttpServer(),
      accessToken,
      'Acme',
    ).expect(201);
    const secondOrganizationResponse = await createOrganization(
      context.app.getHttpServer(),
      accessToken,
      'Beta',
    ).expect(201);

    const managedUserResponse = await createTenantUser(
      context.app.getHttpServer(),
      accessToken,
      firstOrganizationResponse.body.id as string,
      {
        email: 'shared@example.com',
        firstName: 'Shared',
        lastName: 'User',
      },
    ).expect(201);

    await request(context.app.getHttpServer())
      .post('/api/v1/members')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', secondOrganizationResponse.body.id as string)
      .set('Idempotency-Key', createIdempotencyKey('shared-user-member-add'))
      .send({
        userId: managedUserResponse.body.id,
      })
      .expect(201);

    await request(context.app.getHttpServer())
      .patch(`/api/v1/users/${managedUserResponse.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', firstOrganizationResponse.body.id as string)
      .send({
        firstName: 'Changed',
        lastName: 'Everywhere',
      })
      .expect(403);

    await request(context.app.getHttpServer())
      .delete(`/api/v1/users/${managedUserResponse.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', firstOrganizationResponse.body.id as string)
      .expect(403);
  });
});
