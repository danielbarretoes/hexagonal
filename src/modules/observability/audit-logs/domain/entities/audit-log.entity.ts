import { randomUUID } from 'node:crypto';

export interface CreateAuditLogProps {
  action: string;
  actorUserId: string | null;
  organizationId: string | null;
  resourceType: string;
  resourceId: string | null;
  payload: Record<string, unknown> | null;
  createdAt?: Date;
}

export class AuditLog {
  private constructor(
    public readonly id: string,
    public readonly action: string,
    public readonly actorUserId: string | null,
    public readonly organizationId: string | null,
    public readonly resourceType: string,
    public readonly resourceId: string | null,
    public readonly payload: Record<string, unknown> | null,
    public readonly createdAt: Date,
  ) {}

  static create(props: CreateAuditLogProps): AuditLog {
    return new AuditLog(
      randomUUID(),
      props.action.trim(),
      props.actorUserId,
      props.organizationId,
      props.resourceType.trim(),
      props.resourceId,
      props.payload,
      props.createdAt ?? new Date(),
    );
  }
}
