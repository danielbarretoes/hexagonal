export class OrganizationInvitation {
  public readonly id: string;
  public readonly organizationId: string;
  public readonly email: string;
  public readonly roleId: string;
  public readonly tokenHash: string;
  public readonly expiresAt: Date;
  public readonly acceptedAt: Date | null;
  public readonly createdAt: Date;

  private constructor(props: {
    id: string;
    organizationId: string;
    email: string;
    roleId: string;
    tokenHash: string;
    expiresAt: Date;
    acceptedAt: Date | null;
    createdAt: Date;
  }) {
    this.id = props.id;
    this.organizationId = props.organizationId;
    this.email = props.email;
    this.roleId = props.roleId;
    this.tokenHash = props.tokenHash;
    this.expiresAt = props.expiresAt;
    this.acceptedAt = props.acceptedAt;
    this.createdAt = props.createdAt;
    Object.freeze(this);
  }

  static create(props: {
    id: string;
    organizationId: string;
    email: string;
    roleId: string;
    tokenHash: string;
    expiresAt: Date;
  }): OrganizationInvitation {
    return new OrganizationInvitation({
      id: props.id,
      organizationId: props.organizationId,
      email: props.email.toLowerCase().trim(),
      roleId: props.roleId,
      tokenHash: props.tokenHash,
      expiresAt: props.expiresAt,
      acceptedAt: null,
      createdAt: new Date(),
    });
  }

  static rehydrate(props: {
    id: string;
    organizationId: string;
    email: string;
    roleId: string;
    tokenHash: string;
    expiresAt: Date;
    acceptedAt: Date | null;
    createdAt: Date;
  }): OrganizationInvitation {
    return new OrganizationInvitation({
      ...props,
      email: props.email.toLowerCase().trim(),
    });
  }

  get isActive(): boolean {
    return this.acceptedAt === null && this.expiresAt.getTime() > Date.now();
  }

  accept(): OrganizationInvitation {
    return new OrganizationInvitation({
      ...this,
      acceptedAt: new Date(),
    });
  }

  expire(): OrganizationInvitation {
    return new OrganizationInvitation({
      ...this,
      expiresAt: new Date(),
    });
  }
}
