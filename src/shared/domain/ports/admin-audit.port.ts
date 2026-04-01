export interface AdminAuditEntry {
  action: string;
  actorUserId?: string | null;
  organizationId?: string | null;
  resourceType: string;
  resourceId?: string | null;
  payload?: Record<string, unknown> | null;
}

export interface AdminAuditPort {
  record(entry: AdminAuditEntry): Promise<void>;
}
