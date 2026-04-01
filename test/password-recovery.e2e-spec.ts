import request from 'supertest';
import type { E2eTestContext } from './support/e2e-app';
import {
  createE2eTestApp,
  destroyE2eTestApp,
  resetE2eDatabase,
  waitForHttpLogsToDrain,
} from './support/e2e-app';
import { loginUser, selfRegisterUser } from './support/iam-fixtures';

describe('Password Recovery API (e2e, PostgreSQL)', () => {
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

  it('resets a password using a one-time token', async () => {
    await selfRegisterUser(context.app.getHttpServer(), {
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
    }).expect(201);

    const requestResetResponse = await request(context.app.getHttpServer())
      .post('/api/v1/auth/password-reset/request')
      .send({
        email: 'john@example.com',
      })
      .expect(200);

    expect(requestResetResponse.body.resetToken).toEqual(expect.any(String));

    await request(context.app.getHttpServer())
      .post('/api/v1/auth/password-reset/confirm')
      .send({
        token: requestResetResponse.body.resetToken,
        newPassword: 'NewPassword123',
      })
      .expect(204);

    await loginUser(context.app.getHttpServer(), 'john@example.com').expect(401);
    await loginUser(context.app.getHttpServer(), 'john@example.com', 'NewPassword123').expect(200);
  });
});
