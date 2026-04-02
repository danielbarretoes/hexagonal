import { Organization } from '../../domain/entities/organization.entity';
import { CreateOrganizationInvitationUseCase } from './create-organization-invitation.use-case';

describe('CreateOrganizationInvitationUseCase', () => {
  const findByCode = jest.fn();
  const findById = jest.fn();
  const hash = jest.fn();
  const findByEmail = jest.fn();
  const findByUserAndOrganization = jest.fn();
  const findActiveByOrganizationAndEmail = jest.fn();
  const create = jest.fn();
  const update = jest.fn();
  const record = jest.fn();
  const send = jest.fn();
  const runInTransaction = jest.fn();
  const publish = jest.fn();
  const passthrough = async <T>(value: T): Promise<T> => value;

  beforeEach(() => {
    jest.clearAllMocks();
    findByCode.mockResolvedValue({ id: 'role-1' });
    findById.mockResolvedValue(
      Organization.create({
        id: 'org-1',
        name: 'Acme',
      }),
    );
    hash.mockResolvedValue('hashed-token');
    findByEmail.mockResolvedValue(null);
    findByUserAndOrganization.mockResolvedValue(null);
    findActiveByOrganizationAndEmail.mockResolvedValue(null);
    create.mockImplementation(passthrough);
    update.mockImplementation(passthrough);
    record.mockResolvedValue(undefined);
    send.mockResolvedValue(undefined);
    runInTransaction.mockImplementation(async (operation: () => Promise<unknown>) => operation());
    publish.mockResolvedValue(undefined);
  });

  it('creates an invitation and sends an email with the organization context', async () => {
    const useCase = new CreateOrganizationInvitationUseCase(
      {
        findActiveByOrganizationAndEmail,
        create,
        update,
      } as never,
      { findByCode } as never,
      { findById } as never,
      { hash } as never,
      { findByUserAndOrganization } as never,
      { findByEmail } as never,
      { record } as never,
      { send } as never,
      { runInTransaction } as never,
      { publish } as never,
      'sync',
    );

    const response = await useCase.execute({
      organizationId: 'org-1',
      email: 'invitee@example.com',
      roleCode: 'member',
      actorUserId: 'owner-1',
    });

    expect(response.invitationToken).toEqual(expect.any(String));
    expect(send).toHaveBeenCalledWith({
      type: 'organization_invitation',
      to: 'invitee@example.com',
      organizationName: 'Acme',
      roleCode: 'member',
      invitationToken: response.invitationToken,
      expiresInDays: 7,
    });
    expect(record).toHaveBeenCalled();
  });

  it('expires the persisted invitation when sync email delivery fails', async () => {
    send.mockRejectedValue(new Error('SES down'));

    const useCase = new CreateOrganizationInvitationUseCase(
      {
        findActiveByOrganizationAndEmail,
        create,
        update,
      } as never,
      { findByCode } as never,
      { findById } as never,
      { hash } as never,
      { findByUserAndOrganization } as never,
      { findByEmail } as never,
      { record } as never,
      { send } as never,
      { runInTransaction } as never,
      { publish } as never,
      'sync',
    );

    await expect(
      useCase.execute({
        organizationId: 'org-1',
        email: 'invitee@example.com',
        roleCode: 'member',
        actorUserId: 'owner-1',
      }),
    ).rejects.toThrow('SES down');

    expect(update).toHaveBeenCalledTimes(1);
    const expiredInvitation = update.mock.calls[0]?.[0] as { expiresAt: Date };

    expect(expiredInvitation.expiresAt.getTime()).toBeLessThanOrEqual(Date.now());
  });
});
