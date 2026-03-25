/**
 * Member Entity
 * Links User to Organization with a specific Role.
 */

import { MembershipRole } from '../value-objects/membership-role.value-object';

export class Member {
  public readonly id: string;
  public readonly userId: string;
  public readonly organizationId: string;
  public readonly role: MembershipRole;
  public readonly joinedAt: Date;

  private constructor(props: {
    id: string;
    userId: string;
    organizationId: string;
    role: MembershipRole;
    joinedAt: Date;
  }) {
    this.id = props.id;
    this.userId = props.userId;
    this.organizationId = props.organizationId;
    this.role = props.role;
    this.joinedAt = props.joinedAt;
    Object.freeze(this);
  }

  static create(props: {
    id: string;
    userId: string;
    organizationId: string;
    role: MembershipRole;
  }): Member {
    return new Member({
      id: props.id,
      userId: props.userId,
      organizationId: props.organizationId,
      role: props.role,
      joinedAt: new Date(),
    });
  }

  static rehydrate(props: {
    id: string;
    userId: string;
    organizationId: string;
    role: MembershipRole;
    joinedAt: Date;
  }): Member {
    return new Member(props);
  }
}
