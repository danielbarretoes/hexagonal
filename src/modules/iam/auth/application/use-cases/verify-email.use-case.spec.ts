import {
  ActionTokenNotFoundException,
  UserNotFoundException,
} from '../../../shared/domain/exceptions';
import { VerifyEmailUseCase } from './verify-email.use-case';

describe('VerifyEmailUseCase', () => {
  const findById = jest.fn();
  const compare = jest.fn();
  const findUserById = jest.fn();
  const updateUser = jest.fn();
  const updateActionToken = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects malformed, missing, inactive, or mismatched verification tokens', async () => {
    const useCase = new VerifyEmailUseCase(
      { findById, update: updateActionToken } as never,
      { compare } as never,
      { findById: findUserById, update: updateUser } as never,
    );

    await expect(useCase.execute('bad-token')).rejects.toThrow(ActionTokenNotFoundException);

    findById.mockResolvedValueOnce(null);
    await expect(useCase.execute('token-1.secret')).rejects.toThrow(ActionTokenNotFoundException);

    findById.mockResolvedValueOnce({
      purpose: 'email_verification',
      isActive: false,
    });
    await expect(useCase.execute('token-1.secret')).rejects.toThrow(ActionTokenNotFoundException);

    findById.mockResolvedValueOnce({
      id: 'token-1',
      purpose: 'email_verification',
      isActive: true,
      tokenHash: 'stored-hash',
    });
    compare.mockResolvedValueOnce(false);
    await expect(useCase.execute('token-1.secret')).rejects.toThrow(ActionTokenNotFoundException);
  });

  it('marks the user as verified and consumes the token on success', async () => {
    const consumedToken = { id: 'token-1', consumed: true };
    const user = {
      id: 'user-1',
      verifyEmail: jest.fn().mockReturnValue({ id: 'user-1', emailVerifiedAt: new Date() }),
    };
    const actionToken = {
      id: 'token-1',
      userId: 'user-1',
      purpose: 'email_verification',
      isActive: true,
      tokenHash: 'stored-hash',
      consume: jest.fn().mockReturnValue(consumedToken),
    };

    findById.mockResolvedValue(actionToken);
    compare.mockResolvedValue(true);
    findUserById.mockResolvedValue(user);

    const useCase = new VerifyEmailUseCase(
      { findById, update: updateActionToken } as never,
      { compare } as never,
      { findById: findUserById, update: updateUser } as never,
    );

    await useCase.execute('token-1.secret');

    expect(updateUser).toHaveBeenCalledWith('user-1', expect.objectContaining({ id: 'user-1' }));
    expect(updateActionToken).toHaveBeenCalledWith(consumedToken);
  });

  it('fails when the referenced user no longer exists', async () => {
    findById.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      purpose: 'email_verification',
      isActive: true,
      tokenHash: 'stored-hash',
      consume: jest.fn(),
    });
    compare.mockResolvedValue(true);
    findUserById.mockResolvedValue(null);

    const useCase = new VerifyEmailUseCase(
      { findById, update: updateActionToken } as never,
      { compare } as never,
      { findById: findUserById, update: updateUser } as never,
    );

    await expect(useCase.execute('token-1.secret')).rejects.toThrow(UserNotFoundException);
  });
});
