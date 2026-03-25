import 'dotenv/config';
import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureHttpApplication } from '../src/app.setup';
import { UserTypeOrmEntity } from '../src/modules/iam/users/infrastructure/persistence/typeorm/entities/user.entity';
import {
  resetTestDatabase,
  truncateIamTables,
  useTestDatabaseEnvironment,
} from './support/test-database';

describe('IAM API (e2e, PostgreSQL)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    useTestDatabaseEnvironment();
    const bootstrapDataSource = await resetTestDatabase();
    await bootstrapDataSource.destroy();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureHttpApplication(app);
    await app.init();

    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    await truncateIamTables(dataSource);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('registers, authenticates, reads, paginates and soft deletes a user through real HTTP endpoints', async () => {
    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/users')
      .send({
        email: 'john@example.com',
        password: 'Password123',
        firstName: 'John',
        lastName: 'Doe',
      })
      .expect(201);

    expect(registerResponse.body.email).toBe('john@example.com');
    expect(registerResponse.body.fullName).toBe('John Doe');
    expect(registerResponse.body).not.toHaveProperty('isActive');

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'john@example.com',
        password: 'Password123',
      })
      .expect(200);

    expect(loginResponse.body.accessToken).toEqual(expect.any(String));

    const accessToken = loginResponse.body.accessToken as string;
    const userId = registerResponse.body.id as string;

    const getUserResponse = await request(app.getHttpServer())
      .get(`/api/v1/users/${userId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(getUserResponse.body.id).toBe(userId);
    expect(getUserResponse.body.email).toBe('john@example.com');

    const paginatedUsersResponse = await request(app.getHttpServer())
      .get('/api/v1/users?page=1&limit=10')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(paginatedUsersResponse.body.meta.totalItems).toBe(1);
    expect(paginatedUsersResponse.body.items[0].email).toBe('john@example.com');

    const organizationsResponse = await request(app.getHttpServer())
      .get('/api/v1/organizations?page=1&limit=10')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(organizationsResponse.body.meta.totalItems).toBe(0);

    await request(app.getHttpServer())
      .delete(`/api/v1/users/${userId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    const persistedUser = await dataSource.getRepository(UserTypeOrmEntity).findOne({
      where: { id: userId },
      withDeleted: true,
    });

    expect(persistedUser?.deletedAt).toBeInstanceOf(Date);

    await request(app.getHttpServer())
      .get(`/api/v1/users/${userId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'john@example.com',
        password: 'Password123',
      })
      .expect(401);

    const restoreResponse = await request(app.getHttpServer())
      .patch(`/api/v1/users/${userId}/restore`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(restoreResponse.body.id).toBe(userId);

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'john@example.com',
        password: 'Password123',
      })
      .expect(200);

    const createOrganizationResponse = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Acme',
      })
      .expect(201);

    const organizationId = createOrganizationResponse.body.id as string;

    const paginatedOrganizationsBeforeDelete = await request(app.getHttpServer())
      .get('/api/v1/organizations?page=1&limit=10')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(paginatedOrganizationsBeforeDelete.body.meta.totalItems).toBe(1);

    await request(app.getHttpServer())
      .delete(`/api/v1/organizations/${organizationId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    const paginatedOrganizationsAfterDelete = await request(app.getHttpServer())
      .get('/api/v1/organizations?page=1&limit=10')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(paginatedOrganizationsAfterDelete.body.meta.totalItems).toBe(0);

    const restoredOrganizationResponse = await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/restore`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(restoredOrganizationResponse.body.id).toBe(organizationId);

    const getOrganizationResponse = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(getOrganizationResponse.body.name).toBe('Acme');

    const paginatedOrganizationsAfterRestore = await request(app.getHttpServer())
      .get('/api/v1/organizations?page=1&limit=10')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(paginatedOrganizationsAfterRestore.body.meta.totalItems).toBe(1);
  });

  it('returns RFC 7807 problem details for invalid payloads and unauthorized access', async () => {
    const invalidRegistrationResponse = await request(app.getHttpServer())
      .post('/api/v1/users')
      .send({
        email: 'invalid-email',
        password: '123',
        firstName: '',
        lastName: '',
      })
      .expect(400);

    expect(invalidRegistrationResponse.body.type).toContain('validation-failed');
    expect(invalidRegistrationResponse.body.traceId).toEqual(expect.any(String));
    expect(invalidRegistrationResponse.body['invalid-params']).toEqual(expect.any(Array));

    const unauthorizedResponse = await request(app.getHttpServer())
      .get('/api/v1/users?page=1&limit=10')
      .expect(401);

    expect(unauthorizedResponse.body.type).toContain('unauthorized');
    expect(unauthorizedResponse.body.traceId).toEqual(expect.any(String));
  });
});
