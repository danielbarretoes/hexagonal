import { AuthSession } from '../../domain/entities/auth-session.entity';
import { LoginUseCase } from './login.use-case';
import { LogoutAllSessionsUseCase } from './logout-all-sessions.use-case';
import { LogoutSessionUseCase } from './logout-session.use-case';
import { RefreshSessionUseCase } from './refresh-session.use-case';
import { User } from '../../../users/domain/entities/user.entity';
import {
  InvalidCredentialsException,
  SessionNotFoundException,
  UserNotFoundException,
} from '../../../shared/domain/exceptions';

function createUser(): User {
  return User.create({
    id: 'user-1',
    email: 'owner@example.com',
    passwordHash: 'stored-hash',
    firstName: 'Owner',
    lastName: 'User',
  });
}

function createSession(
  overrides?: Partial<Parameters<typeof AuthSession.rehydrate>[0]>,
): AuthSession {
  return AuthSession.rehydrate({
    id: 'session-1',
    userId: 'user-1',
    refreshTokenHash: 'stored-hash',
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    createdAt: new Date('2026-04-01T00:00:00.000Z'),
    updatedAt: new Date('2026-04-01T00:00:00.000Z'),
    ...overrides,
  });
}

describe('auth session flows', () => {
  const authRuntimeOptions = {
    refreshSessionTtlMs: 86_400_000,
    exposePrivateTokens: true,
    rateLimit: {
      enabled: true,
      ttlMs: 60_000,
      limit: 10,
    },
  } as const;

  it('creates a session and returns access plus refresh tokens on login', async () => {
    const userRepository = {
      findByEmail: jest.fn().mockResolvedValue(createUser()),
    };
    const jwtTokenPort = {
      generateToken: jest.fn().mockReturnValue('jwt-token'),
    };
    const passwordHasher = {
      compare: jest.fn().mockResolvedValue(true),
      hash: jest.fn().mockResolvedValue('refresh-hash'),
    };
    const authSessionRepository = {
      create: jest.fn().mockResolvedValue(undefined),
    };

    const useCase = new LoginUseCase(
      userRepository as never,
      jwtTokenPort as never,
      passwordHasher as never,
      authSessionRepository as never,
      authRuntimeOptions,
    );

    const response = await useCase.execute({
      email: 'owner@example.com',
      password: 'Password123',
    });

    expect(response.accessToken).toBe('jwt-token');
    expect(response.refreshToken).toEqual(expect.stringMatching(/^[^.]+\.[^.]+$/));
    expect(response.userId).toBe('user-1');
    expect(authSessionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
      }),
    );
    expect(passwordHasher.hash).toHaveBeenCalled();
  });

  it('fails login when the user does not exist or the password does not match', async () => {
    const missingUserUseCase = new LoginUseCase(
      { findByEmail: jest.fn().mockResolvedValue(null) } as never,
      { generateToken: jest.fn() } as never,
      { compare: jest.fn(), hash: jest.fn() } as never,
      { create: jest.fn() } as never,
      authRuntimeOptions,
    );

    await expect(
      missingUserUseCase.execute({
        email: 'missing@example.com',
        password: 'Password123',
      }),
    ).rejects.toThrow(InvalidCredentialsException);

    const invalidPasswordUseCase = new LoginUseCase(
      { findByEmail: jest.fn().mockResolvedValue(createUser()) } as never,
      { generateToken: jest.fn() } as never,
      { compare: jest.fn().mockResolvedValue(false), hash: jest.fn() } as never,
      { create: jest.fn() } as never,
      authRuntimeOptions,
    );

    await expect(
      invalidPasswordUseCase.execute({
        email: 'owner@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toThrow(InvalidCredentialsException);
  });

  it('rotates refresh sessions and returns a new opaque token', async () => {
    const authSessionRepository = {
      findById: jest.fn().mockResolvedValue(createSession()),
      update: jest.fn().mockResolvedValue(undefined),
    };
    const userRepository = {
      findById: jest.fn().mockResolvedValue(createUser()),
    };
    const jwtTokenPort = {
      generateToken: jest.fn().mockReturnValue('rotated-jwt'),
    };
    const passwordHasher = {
      compare: jest.fn().mockResolvedValue(true),
      hash: jest.fn().mockResolvedValue('next-hash'),
    };

    const useCase = new RefreshSessionUseCase(
      authSessionRepository as never,
      userRepository as never,
      jwtTokenPort as never,
      passwordHasher as never,
      authRuntimeOptions,
    );

    const response = await useCase.execute('session-1.secret-1');

    expect(response.accessToken).toBe('rotated-jwt');
    expect(response.refreshToken).toEqual(expect.stringMatching(/^session-1\.[^.]+$/));
    expect(authSessionRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'session-1',
      }),
    );
  });

  it('fails refresh when the token is invalid, the session is inactive, or the user is missing', async () => {
    const missingTokenUseCase = new RefreshSessionUseCase(
      { findById: jest.fn(), update: jest.fn() } as never,
      { findById: jest.fn() } as never,
      { generateToken: jest.fn() } as never,
      { compare: jest.fn(), hash: jest.fn() } as never,
      authRuntimeOptions,
    );

    await expect(missingTokenUseCase.execute('bad-token')).rejects.toThrow(
      SessionNotFoundException,
    );

    const revokedSessionUseCase = new RefreshSessionUseCase(
      {
        findById: jest.fn().mockResolvedValue(
          createSession({
            revokedAt: new Date('2026-04-01T00:05:00.000Z'),
          }),
        ),
        update: jest.fn(),
      } as never,
      { findById: jest.fn() } as never,
      { generateToken: jest.fn() } as never,
      { compare: jest.fn().mockResolvedValue(true), hash: jest.fn() } as never,
      authRuntimeOptions,
    );

    await expect(revokedSessionUseCase.execute('session-1.secret-1')).rejects.toThrow(
      SessionNotFoundException,
    );

    const missingUserUseCase = new RefreshSessionUseCase(
      {
        findById: jest.fn().mockResolvedValue(createSession()),
        update: jest.fn(),
      } as never,
      { findById: jest.fn().mockResolvedValue(null) } as never,
      { generateToken: jest.fn() } as never,
      {
        compare: jest.fn().mockResolvedValue(true),
        hash: jest.fn().mockResolvedValue('hash'),
      } as never,
      authRuntimeOptions,
    );

    await expect(missingUserUseCase.execute('session-1.secret-1')).rejects.toThrow(
      UserNotFoundException,
    );
  });

  it('revokes a single session and records the audit event on logout', async () => {
    const authSessionRepository = {
      findById: jest.fn().mockResolvedValue(createSession()),
      update: jest.fn().mockResolvedValue(undefined),
    };
    const passwordHasher = {
      compare: jest.fn().mockResolvedValue(true),
    };
    const adminAuditPort = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    const useCase = new LogoutSessionUseCase(
      authSessionRepository as never,
      passwordHasher as never,
      adminAuditPort as never,
    );

    await useCase.execute('session-1.secret-1');

    expect(authSessionRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'session-1',
      }),
    );
    expect(adminAuditPort.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'iam.auth.session.revoked',
        resourceId: 'session-1',
      }),
    );
  });

  it('revokes all sessions for a user and records a batch audit event', async () => {
    const authSessionRepository = {
      revokeAllActiveByUserId: jest.fn().mockResolvedValue(undefined),
    };
    const adminAuditPort = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    const useCase = new LogoutAllSessionsUseCase(
      authSessionRepository as never,
      adminAuditPort as never,
    );

    await useCase.execute('user-1');

    expect(authSessionRepository.revokeAllActiveByUserId).toHaveBeenCalledWith('user-1');
    expect(adminAuditPort.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'iam.auth.sessions.revoked_all',
        actorUserId: 'user-1',
      }),
    );
  });
});
