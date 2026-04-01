import { OrganizationInvitation } from '../entities/organization-invitation.entity';

export interface OrganizationInvitationRepositoryPort {
  findById(id: string): Promise<OrganizationInvitation | null>;
  findActiveByOrganizationAndEmail(
    organizationId: string,
    email: string,
  ): Promise<OrganizationInvitation | null>;
  create(invitation: OrganizationInvitation): Promise<OrganizationInvitation>;
  update(invitation: OrganizationInvitation): Promise<OrganizationInvitation>;
}
