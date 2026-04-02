import { randomUUID } from 'node:crypto';
import request from 'supertest';

export interface SelfRegisterUserInput {
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
}

export function createIdempotencyKey(label = 'test'): string {
  return `${label}-${randomUUID()}`;
}

export function selfRegisterUser(
  httpServer: Parameters<typeof request>[0],
  input: SelfRegisterUserInput,
) {
  return request(httpServer)
    .post('/api/v1/users/self-register')
    .set('Idempotency-Key', createIdempotencyKey('self-register'))
    .send({
      password: input.password ?? 'Password123',
      firstName: input.firstName ?? 'John',
      lastName: input.lastName ?? 'Doe',
      ...input,
    });
}

export function loginUser(
  httpServer: Parameters<typeof request>[0],
  email: string,
  password = 'Password123',
) {
  return request(httpServer).post('/api/v1/auth/login').send({
    email,
    password,
  });
}

export function createOrganization(
  httpServer: Parameters<typeof request>[0],
  accessToken: string,
  name = 'Acme',
) {
  return request(httpServer)
    .post('/api/v1/organizations')
    .set('Authorization', `Bearer ${accessToken}`)
    .set('Idempotency-Key', createIdempotencyKey('organization-create'))
    .send({ name });
}

export function createTenantUser(
  httpServer: Parameters<typeof request>[0],
  accessToken: string,
  organizationId: string,
  input: SelfRegisterUserInput,
) {
  return request(httpServer)
    .post('/api/v1/users')
    .set('Authorization', `Bearer ${accessToken}`)
    .set('x-organization-id', organizationId)
    .set('Idempotency-Key', createIdempotencyKey('tenant-user-create'))
    .send({
      password: input.password ?? 'Password123',
      firstName: input.firstName ?? 'Jane',
      lastName: input.lastName ?? 'Doe',
      ...input,
    });
}
