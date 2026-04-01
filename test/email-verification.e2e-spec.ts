import request from 'supertest';
import { UserTypeOrmEntity } from '../src/modules/iam/users/infrastructure/persistence/typeorm/entities/user.entity';
import type { E2eTestContext } from './support/e2e-app';
import {
  createE2eTestApp,
  destroyE2eTestApp,
  resetE2eDatabase,
  waitForHttpLogsToDrain,
} from './support/e2e-app';
import { loginUser, selfRegisterUser } from './support/iam-fixtures';

describe('Email Verification API (e2e, PostgreSQL)', () => {
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

  it('verifies a user email with a one-time token', async () => {
    const registrationResponse = await selfRegisterUser(context.app.getHttpServer(), {
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
    }).expect(201);

    const loginResponse = await loginUser(context.app.getHttpServer(), 'john@example.com').expect(
      200,
    );

    const requestVerificationResponse = await request(context.app.getHttpServer())
      .post('/api/v1/auth/email-verification/request')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .expect(200);

    expect(requestVerificationResponse.body.verificationToken).toEqual(expect.any(String));

    await request(context.app.getHttpServer())
      .post('/api/v1/auth/email-verification/confirm')
      .send({
        token: requestVerificationResponse.body.verificationToken,
      })
      .expect(204);

    const persistedUser = await context.dataSource.getRepository(UserTypeOrmEntity).findOne({
      where: {
        id: registrationResponse.body.id,
      },
    });

    expect(persistedUser?.emailVerifiedAt).toBeInstanceOf(Date);
  });
});
