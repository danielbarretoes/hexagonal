/**
 * User Entity
 * Core domain entity representing a user identity.
 */

export interface CreateUserProps {
  readonly email: string;
  readonly passwordHash: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly emailVerifiedAt?: Date | null;
}

export class User {
  public readonly id: string;
  public readonly email: string;
  public readonly passwordHash: string;
  public readonly firstName: string;
  public readonly lastName: string;
  public readonly emailVerifiedAt: Date | null;
  public readonly deletedAt: Date | null;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  private constructor(props: {
    id: string;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    emailVerifiedAt: Date | null;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = props.id;
    this.email = props.email;
    this.passwordHash = props.passwordHash;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.emailVerifiedAt = props.emailVerifiedAt;
    this.deletedAt = props.deletedAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    Object.freeze(this);
  }

  static create(props: CreateUserProps & { id: string }): User {
    const now = new Date();
    return new User({
      id: props.id,
      email: props.email.toLowerCase().trim(),
      passwordHash: props.passwordHash,
      firstName: props.firstName.trim(),
      lastName: props.lastName.trim(),
      emailVerifiedAt: props.emailVerifiedAt ?? null,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static rehydrate(props: {
    id: string;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    emailVerifiedAt: Date | null;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return new User({
      id: props.id,
      email: props.email.toLowerCase().trim(),
      passwordHash: props.passwordHash,
      firstName: props.firstName.trim(),
      lastName: props.lastName.trim(),
      emailVerifiedAt: props.emailVerifiedAt,
      deletedAt: props.deletedAt,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    });
  }

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  get isDeleted(): boolean {
    return this.deletedAt !== null;
  }

  get isEmailVerified(): boolean {
    return this.emailVerifiedAt !== null;
  }

  softDelete(): User {
    return new User({
      ...this,
      deletedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  restore(): User {
    return new User({
      ...this,
      deletedAt: null,
      updatedAt: new Date(),
    });
  }

  updateProfile(firstName: string, lastName: string): User {
    return new User({
      ...this,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      updatedAt: new Date(),
    });
  }

  updatePassword(passwordHash: string): User {
    return new User({
      ...this,
      passwordHash,
      updatedAt: new Date(),
    });
  }

  verifyEmail(): User {
    if (this.isEmailVerified) {
      return this;
    }

    return new User({
      ...this,
      emailVerifiedAt: new Date(),
      updatedAt: new Date(),
    });
  }
}
