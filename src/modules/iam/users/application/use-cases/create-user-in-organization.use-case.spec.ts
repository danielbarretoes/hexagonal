import { DEFAULT_ROLE_CODES } from '../../../shared/domain/authorization/default-role-codes';
import {
  RoleNotFoundException,
  UserAlreadyExistsException,
} from '../../../shared/domain/exceptions';
import { CreateUserInOrganizationUseCase } from './create-user-in-organization.use-case';

describe('CreateUserInOrganizationUseCase', () => {
  const findByEmail = jest.fn();
  const createUser = jest.fn();
  const createMember = jest.fn();
  const findByCode = jest.fn();
  const hash = jest.fn();
  const runInTransaction = jest.fn();
  const publish = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    runInTransaction.mockImplementation(async (operation: () => Promise<unknown>) => operation());
  });

  it('rejects duplicate users before creating anything', async () => {
    findByEmail.mockResolvedValue({ id: 'user-1' });

    const useCase = new CreateUserInOrganizationUseCase(
      { findByEmail, create: createUser } as never,
      { create: createMember } as never,
      { findByCode } as never,
      { hash } as never,
      { runInTransaction } as never,
      { publish } as never,
    );

    await expect(
      useCase.execute({
        organizationId: 'org-1',
        email: 'owner@example.com',
        password: 'Password123',
        firstName: 'Owner',
        lastName: 'User',
      }),
    ).rejects.toThrow(UserAlreadyExistsException);
  });

  it('fails when the requested role code is not found', async () => {
    findByEmail.mockResolvedValue(null);
    hash.mockResolvedValue('hashed-password');
    createUser.mockResolvedValue({
      id: 'user-1',
      email: 'owner@example.com',
      firstName: 'Owner',
      lastName: 'User',
    });
    findByCode.mockResolvedValue(null);

    const useCase = new CreateUserInOrganizationUseCase(
      { findByEmail, create: createUser } as never,
      { create: createMember } as never,
      { findByCode } as never,
      { hash } as never,
      { runInTransaction } as never,
      { publish } as never,
    );

    await expect(
      useCase.execute({
        organizationId: 'org-1',
        email: 'owner@example.com',
        password: 'Password123',
        firstName: 'Owner',
        lastName: 'User',
        roleCode: 'member',
      }),
    ).rejects.toThrow(RoleNotFoundException);
  });

  it('creates the user, membership, and webhook event with the default role when omitted', async () => {
    findByEmail.mockResolvedValue(null);
    hash.mockResolvedValue('hashed-password');
    createUser.mockResolvedValue({
      id: 'user-1',
      email: 'owner@example.com',
      firstName: 'Owner',
      lastName: 'User',
    });
    findByCode.mockResolvedValue({ id: 'role-1' });

    const useCase = new CreateUserInOrganizationUseCase(
      { findByEmail, create: createUser } as never,
      { create: createMember } as never,
      { findByCode } as never,
      { hash } as never,
      { runInTransaction } as never,
      { publish } as never,
    );

    const user = await useCase.execute({
      organizationId: 'org-1',
      email: 'owner@example.com',
      password: 'Password123',
      firstName: 'Owner',
      lastName: 'User',
    });

    expect(user).toEqual(
      expect.objectContaining({
        id: 'user-1',
      }),
    );
    expect(findByCode).toHaveBeenCalledWith(DEFAULT_ROLE_CODES[3]);
    expect(createMember).toHaveBeenCalledWith({
      userId: 'user-1',
      organizationId: 'org-1',
      roleId: 'role-1',
    });
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
      }),
    );
  });
});
