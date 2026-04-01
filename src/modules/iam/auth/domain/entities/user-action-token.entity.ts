export type UserActionTokenPurpose = 'password_reset' | 'email_verification';

export class UserActionToken {
  public readonly id: string;
  public readonly userId: string;
  public readonly purpose: UserActionTokenPurpose;
  public readonly tokenHash: string;
  public readonly expiresAt: Date;
  public readonly consumedAt: Date | null;
  public readonly createdAt: Date;

  private constructor(props: {
    id: string;
    userId: string;
    purpose: UserActionTokenPurpose;
    tokenHash: string;
    expiresAt: Date;
    consumedAt: Date | null;
    createdAt: Date;
  }) {
    this.id = props.id;
    this.userId = props.userId;
    this.purpose = props.purpose;
    this.tokenHash = props.tokenHash;
    this.expiresAt = props.expiresAt;
    this.consumedAt = props.consumedAt;
    this.createdAt = props.createdAt;
    Object.freeze(this);
  }

  static create(props: {
    id: string;
    userId: string;
    purpose: UserActionTokenPurpose;
    tokenHash: string;
    expiresAt: Date;
  }): UserActionToken {
    return new UserActionToken({
      id: props.id,
      userId: props.userId,
      purpose: props.purpose,
      tokenHash: props.tokenHash,
      expiresAt: props.expiresAt,
      consumedAt: null,
      createdAt: new Date(),
    });
  }

  static rehydrate(props: {
    id: string;
    userId: string;
    purpose: UserActionTokenPurpose;
    tokenHash: string;
    expiresAt: Date;
    consumedAt: Date | null;
    createdAt: Date;
  }): UserActionToken {
    return new UserActionToken(props);
  }

  get isActive(): boolean {
    return this.consumedAt === null && this.expiresAt.getTime() > Date.now();
  }

  consume(): UserActionToken {
    return new UserActionToken({
      ...this,
      consumedAt: new Date(),
    });
  }
}
