export class AuthSession {
  public readonly id: string;
  public readonly userId: string;
  public readonly refreshTokenHash: string;
  public readonly expiresAt: Date;
  public readonly revokedAt: Date | null;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  private constructor(props: {
    id: string;
    userId: string;
    refreshTokenHash: string;
    expiresAt: Date;
    revokedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = props.id;
    this.userId = props.userId;
    this.refreshTokenHash = props.refreshTokenHash;
    this.expiresAt = props.expiresAt;
    this.revokedAt = props.revokedAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    Object.freeze(this);
  }

  static create(props: {
    id: string;
    userId: string;
    refreshTokenHash: string;
    expiresAt: Date;
  }): AuthSession {
    const now = new Date();
    return new AuthSession({
      id: props.id,
      userId: props.userId,
      refreshTokenHash: props.refreshTokenHash,
      expiresAt: props.expiresAt,
      revokedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static rehydrate(props: {
    id: string;
    userId: string;
    refreshTokenHash: string;
    expiresAt: Date;
    revokedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): AuthSession {
    return new AuthSession(props);
  }

  get isActive(): boolean {
    return this.revokedAt === null && this.expiresAt.getTime() > Date.now();
  }

  rotate(refreshTokenHash: string, expiresAt: Date): AuthSession {
    return new AuthSession({
      ...this,
      refreshTokenHash,
      expiresAt,
      revokedAt: null,
      updatedAt: new Date(),
    });
  }

  revoke(): AuthSession {
    return new AuthSession({
      ...this,
      revokedAt: new Date(),
      updatedAt: new Date(),
    });
  }
}
