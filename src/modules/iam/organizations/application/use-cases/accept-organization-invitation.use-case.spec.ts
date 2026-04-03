import {
  InvitationEmailMismatchException,
  MemberAlreadyExistsException,
  OrganizationInvitationNotFoundException,
  UserNotFoundException,
} from '../../../shared/domain/exceptions';
import { AcceptOrganizationInvitationUseCase } from './accept-organization-invitation.use-case';

describe('AcceptOrganizationInvitationUseCase', () => {
  const findInvitationById = jest.fn();
  const updateInvitation = jest.fn();
  const findUserById = jest.fn();
  const compare = jest.fn();
  const findByUserAndOrganization = jest.fn();
  const createMember = jest.fn();
  const record = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects malformed, missing, inactive, or mismatched invitations', async () => {
    const useCase = new AcceptOrganizationInvitationUseCase(
      { findById: findInvitationById, update: updateInvitation } as never,
      { findById: findUserById } as never,
      { compare } as never,
      { findByUserAndOrganization, create: createMember } as never,
      { record } as never,
    );

    await expect(useCase.execute('bad-token', 'user-1')).rejects.toThrow(
      OrganizationInvitationNotFoundException,
    );

    findInvitationById.mockResolvedValueOnce(null);
    await expect(useCase.execute('invite-1.secret', 'user-1')).rejects.toThrow(
      OrganizationInvitationNotFoundException,
    );

    findInvitationById.mockResolvedValueOnce({ isActive: false });
    await expect(useCase.execute('invite-1.secret', 'user-1')).rejects.toThrow(
      OrganizationInvitationNotFoundException,
    );

    findInvitationById.mockResolvedValueOnce({
      id: 'invite-1',
      organizationId: 'org-1',
      email: 'owner@example.com',
      roleId: 'role-1',
      tokenHash: 'stored-hash',
      isActive: true,
    });
    compare.mockResolvedValueOnce(false);
    await expect(useCase.execute('invite-1.secret', 'user-1')).rejects.toThrow(
      OrganizationInvitationNotFoundException,
    );
  });

  it('fails when the user is missing, the email mismatches, or the member already exists', async () => {
    const invitation = {
      id: 'invite-1',
      organizationId: 'org-1',
      email: 'owner@example.com',
      roleId: 'role-1',
      tokenHash: 'stored-hash',
      isActive: true,
      accept: jest.fn(),
    };

    findInvitationById.mockResolvedValue(invitation);
    compare.mockResolvedValue(true);

    const useCase = new AcceptOrganizationInvitationUseCase(
      { findById: findInvitationById, update: updateInvitation } as never,
      { findById: findUserById } as never,
      { compare } as never,
      { findByUserAndOrganization, create: createMember } as never,
      { record } as never,
    );

    findUserById.mockResolvedValueOnce(null);
    await expect(useCase.execute('invite-1.secret', 'user-1')).rejects.toThrow(
      UserNotFoundException,
    );

    findUserById.mockResolvedValueOnce({ id: 'user-1', email: 'other@example.com' });
    await expect(useCase.execute('invite-1.secret', 'user-1')).rejects.toThrow(
      InvitationEmailMismatchException,
    );

    findUserById.mockResolvedValueOnce({ id: 'user-1', email: 'owner@example.com' });
    findByUserAndOrganization.mockResolvedValueOnce({ id: 'member-1' });
    await expect(useCase.execute('invite-1.secret', 'user-1')).rejects.toThrow(
      MemberAlreadyExistsException,
    );
  });

  it('creates the membership, consumes the invitation, and records the audit event on success', async () => {
    const acceptedInvitation = { id: 'invite-1', accepted: true };
    const invitation = {
      id: 'invite-1',
      organizationId: 'org-1',
      email: 'owner@example.com',
      roleId: 'role-1',
      tokenHash: 'stored-hash',
      isActive: true,
      accept: jest.fn().mockReturnValue(acceptedInvitation),
    };

    findInvitationById.mockResolvedValue(invitation);
    compare.mockResolvedValue(true);
    findUserById.mockResolvedValue({ id: 'user-1', email: 'owner@example.com' });
    findByUserAndOrganization.mockResolvedValue(null);
    createMember.mockResolvedValue({ id: 'member-1' });

    const useCase = new AcceptOrganizationInvitationUseCase(
      { findById: findInvitationById, update: updateInvitation } as never,
      { findById: findUserById } as never,
      { compare } as never,
      { findByUserAndOrganization, create: createMember } as never,
      { record } as never,
    );

    await useCase.execute('invite-1.secret', 'user-1');

    expect(createMember).toHaveBeenCalledWith({
      userId: 'user-1',
      organizationId: 'org-1',
      roleId: 'role-1',
    });
    expect(updateInvitation).toHaveBeenCalledWith(acceptedInvitation);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'iam.organization_invitation.accepted',
        resourceId: 'invite-1',
      }),
    );
  });
});
