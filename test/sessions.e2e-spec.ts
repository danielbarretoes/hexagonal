import request from 'supertest';
import type { E2eTestContext } from './support/e2e-app';
import {
  createE2eTestApp,
  destroyE2eTestApp,
  resetE2eDatabase,
  waitForHttpLogsToDrain,
} from './support/e2e-app';
import { loginUser, selfRegisterUser } from './support/iam-fixtures';

describe('Sessions API (e2e, PostgreSQL)', () => {
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

  it('rotates refresh tokens and rejects reused session tokens', async () => {
    await selfRegisterUser(context.app.getHttpServer(), {
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
    }).expect(201);

    const loginResponse = await loginUser(context.app.getHttpServer(), 'john@example.com').expect(
      200,
    );
    expect(loginResponse.body.refreshToken).toEqual(expect.any(String));

    const firstRefreshToken = loginResponse.body.refreshToken as string;

    const refreshResponse = await request(context.app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({
        refreshToken: firstRefreshToken,
      })
      .expect(200);

    expect(refreshResponse.body.accessToken).toEqual(expect.any(String));
    expect(refreshResponse.body.refreshToken).toEqual(expect.any(String));
    expect(refreshResponse.body.refreshToken).not.toBe(firstRefreshToken);

    await request(context.app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({
        refreshToken: firstRefreshToken,
      })
      .expect(401);
  });
});
