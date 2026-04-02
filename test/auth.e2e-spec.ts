import request from 'supertest';
import type { E2eTestContext } from './support/e2e-app';
import {
  createE2eTestApp,
  destroyE2eTestApp,
  resetE2eDatabase,
  waitForHttpLog,
  waitForHttpLogsToDrain,
} from './support/e2e-app';
import { createIdempotencyKey, loginUser, selfRegisterUser } from './support/iam-fixtures';

describe('Auth API (e2e, PostgreSQL)', () => {
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

  it('self-registers a user, authenticates, and redacts secrets in HTTP logs', async () => {
    const registerResponse = await selfRegisterUser(context.app.getHttpServer(), {
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
    }).expect(201);

    expect(registerResponse.body.email).toBe('john@example.com');
    expect(registerResponse.body.fullName).toBe('John Doe');

    const registrationLog = await waitForHttpLog(context.dataSource, {
      method: 'POST',
      path: '/api/v1/users/self-register',
      statusCode: 201,
    });

    expect(registrationLog.requestBody).toMatchObject({
      email: 'john@example.com',
      password: '[REDACTED]',
    });
    expect(registrationLog.responseBody).toMatchObject({
      email: 'john@example.com',
    });

    const loginResponse = await loginUser(context.app.getHttpServer(), 'john@example.com').expect(
      200,
    );

    expect(loginResponse.body.accessToken).toEqual(expect.any(String));

    const loginLog = await waitForHttpLog(context.dataSource, {
      method: 'POST',
      path: '/api/v1/auth/login',
      statusCode: 200,
    });

    expect(loginLog.responseBody).toMatchObject({
      accessToken: '[REDACTED]',
    });
  });

  it('returns RFC 7807 problem details for invalid payloads and unauthorized access', async () => {
    const invalidRegistrationResponse = await request(context.app.getHttpServer())
      .post('/api/v1/users/self-register')
      .set('Idempotency-Key', createIdempotencyKey('invalid-register'))
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

    const invalidRegistrationLog = await waitForHttpLog(context.dataSource, {
      method: 'POST',
      path: '/api/v1/users/self-register',
      statusCode: 400,
    });

    expect(invalidRegistrationLog.requestBody).toMatchObject({
      email: 'invalid-email',
      password: '[REDACTED]',
    });
    expect(invalidRegistrationLog.errorMessage).toBe('Bad Request Exception');

    const unauthorizedResponse = await request(context.app.getHttpServer())
      .get('/api/v1/users?page=1&limit=10')
      .expect(401);

    expect(unauthorizedResponse.body.type).toContain('unauthorized');
    expect(unauthorizedResponse.body.traceId).toEqual(expect.any(String));

    const unauthorizedLog = await waitForHttpLog(context.dataSource, {
      method: 'GET',
      path: '/api/v1/users',
      statusCode: 401,
    });

    expect(unauthorizedLog.errorMessage).toBe('Missing authentication token');
    expect(unauthorizedLog.queryParams).toMatchObject({
      page: '1',
      limit: '10',
    });
  });

  it('requires an idempotency key for idempotent registration routes', async () => {
    const response = await request(context.app.getHttpServer())
      .post('/api/v1/users/self-register')
      .send({
        email: 'john@example.com',
        password: 'Password123',
        firstName: 'John',
        lastName: 'Doe',
      })
      .expect(400);

    expect(response.body.detail).toBe('Idempotency-Key header is required for this endpoint');
  });
});
