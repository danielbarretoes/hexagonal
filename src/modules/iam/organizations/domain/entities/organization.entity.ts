/**
 * Organization Entity
 * Represents a business tenant in the system.
 */

import { InvalidOrganizationNameException } from '../../../shared/domain/exceptions';

export interface CreateOrganizationProps {
  readonly name: string;
}

export class Organization {
  public readonly id: string;
  public readonly name: string;
  public readonly deletedAt: Date | null;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  private constructor(props: {
    id: string;
    name: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = props.id;
    this.name = props.name.trim();
    this.deletedAt = props.deletedAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    Object.freeze(this);
  }

  static create(props: CreateOrganizationProps & { id: string }): Organization {
    const name = props.name.trim();
    if (name.length < 2 || name.length > 100) {
      throw new InvalidOrganizationNameException();
    }
    const now = new Date();
    return new Organization({
      id: props.id,
      name,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static rehydrate(props: {
    id: string;
    name: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Organization {
    return new Organization({
      id: props.id,
      name: props.name,
      deletedAt: props.deletedAt,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    });
  }

  get isDeleted(): boolean {
    return this.deletedAt !== null;
  }

  updateName(name: string): Organization {
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 100) {
      throw new InvalidOrganizationNameException();
    }
    return new Organization({
      ...this,
      name: trimmed,
      updatedAt: new Date(),
    });
  }

  softDelete(): Organization {
    return new Organization({
      ...this,
      deletedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  restore(): Organization {
    return new Organization({
      ...this,
      deletedAt: null,
      updatedAt: new Date(),
    });
  }
}
