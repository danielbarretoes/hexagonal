export class Permission {
  public readonly id: string;
  public readonly code: string;
  public readonly description: string | null;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  private constructor(props: {
    id: string;
    code: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = props.id;
    this.code = props.code;
    this.description = props.description;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    Object.freeze(this);
  }

  static rehydrate(props: {
    id: string;
    code: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): Permission {
    return new Permission(props);
  }
}
