/**
 * Membership role value object.
 * Keeps authorization role semantics inside the organizations feature instead of
 * depending on a global users/roles persistence model.
 */

import { InvalidMembershipRoleException } from '../../../shared/domain/exceptions';

export const MEMBERSHIP_ROLE_NAMES = ['owner', 'admin', 'manager', 'member', 'guest'] as const;

export type MembershipRoleName = (typeof MEMBERSHIP_ROLE_NAMES)[number];

export interface MembershipPermissions {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canView: boolean;
}

const MEMBERSHIP_PERMISSIONS: Record<MembershipRoleName, MembershipPermissions> = {
  owner: { canCreate: true, canEdit: true, canDelete: true, canView: true },
  admin: { canCreate: true, canEdit: true, canDelete: true, canView: true },
  manager: { canCreate: true, canEdit: true, canDelete: false, canView: true },
  member: { canCreate: false, canEdit: false, canDelete: false, canView: true },
  guest: { canCreate: false, canEdit: false, canDelete: false, canView: false },
};

export class MembershipRole {
  private constructor(public readonly name: MembershipRoleName) {}

  static create(name: string): MembershipRole {
    if (!MEMBERSHIP_ROLE_NAMES.includes(name as MembershipRoleName)) {
      throw new InvalidMembershipRoleException(name);
    }

    return new MembershipRole(name as MembershipRoleName);
  }

  get permissions(): MembershipPermissions {
    return MEMBERSHIP_PERMISSIONS[this.name];
  }

  can(action: keyof MembershipPermissions): boolean {
    return this.permissions[action];
  }
}
