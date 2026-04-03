import {
  ActionTokenNotFoundException,
  UserNotFoundException,
} from '../../../shared/domain/exceptions';
import { ResetPasswordUseCase } from './reset-password.use-case';

describe('ResetPasswordUseCase', () => {
  const findById = jest.fn();
  const compare = jest.fn();
  const hash = jest.fn();
  const findUserById = jest.fn();
  const updateUser = jest.fn();
  const updateActionToken = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects malformed, missing, inactive, or mismatched reset tokens', async () => {
    const useCase = new ResetPasswordUseCase(
      { findById, update: updateActionToken } as never,
      { compare, hash } as never,
      { findById: findUserById, update: updateUser } as never,
    );

    await expect(useCase.execute('bad-token', 'Password123')).rejects.toThrow(
      ActionTokenNotFoundException,
    );

    findById.mockResolvedValueOnce(null);
    await expect(useCase.execute('token-1.secret', 'Password123')).rejects.toThrow(
      ActionTokenNotFoundException,
    );

    findById.mockResolvedValueOnce({
      purpose: 'password_reset',
      isActive: false,
    });
    await expect(useCase.execute('token-1.secret', 'Password123')).rejects.toThrow(
      ActionTokenNotFoundException,
    );

    findById.mockResolvedValueOnce({
      id: 'token-1',
      purpose: 'password_reset',
      isActive: true,
      tokenHash: 'stored-hash',
    });
    compare.mockResolvedValueOnce(false);
    await expect(useCase.execute('token-1.secret', 'Password123')).rejects.toThrow(
      ActionTokenNotFoundException,
    );
  });

  it('updates the user password and consumes the token on success', async () => {
    const consumedToken = { id: 'token-1', consumed: true };
    const user = {
      id: 'user-1',
      updatePassword: jest.fn().mockReturnValue({ id: 'user-1', passwordHash: 'new-hash' }),
    };
    const actionToken = {
      id: 'token-1',
      userId: 'user-1',
      purpose: 'password_reset',
      isActive: true,
      tokenHash: 'stored-hash',
      consume: jest.fn().mockReturnValue(consumedToken),
    };

    findById.mockResolvedValue(actionToken);
    compare.mockResolvedValue(true);
    hash.mockResolvedValue('new-hash');
    findUserById.mockResolvedValue(user);

    const useCase = new ResetPasswordUseCase(
      { findById, update: updateActionToken } as never,
      { compare, hash } as never,
      { findById: findUserById, update: updateUser } as never,
    );

    await useCase.execute('token-1.secret', 'Password123');

    expect(hash).toHaveBeenCalledWith('Password123');
    expect(updateUser).toHaveBeenCalledWith('user-1', {
      id: 'user-1',
      passwordHash: 'new-hash',
    });
    expect(updateActionToken).toHaveBeenCalledWith(consumedToken);
  });

  it('fails when the referenced user no longer exists', async () => {
    findById.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      purpose: 'password_reset',
      isActive: true,
      tokenHash: 'stored-hash',
      consume: jest.fn(),
    });
    compare.mockResolvedValue(true);
    findUserById.mockResolvedValue(null);

    const useCase = new ResetPasswordUseCase(
      { findById, update: updateActionToken } as never,
      { compare, hash } as never,
      { findById: findUserById, update: updateUser } as never,
    );

    await expect(useCase.execute('token-1.secret', 'Password123')).rejects.toThrow(
      UserNotFoundException,
    );
  });
});
