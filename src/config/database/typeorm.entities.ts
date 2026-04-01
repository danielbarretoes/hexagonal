import { AuthSessionTypeOrmEntity } from '../../modules/iam/auth/infrastructure/persistence/typeorm/entities/auth-session.entity';
import { UserActionTokenTypeOrmEntity } from '../../modules/iam/auth/infrastructure/persistence/typeorm/entities/user-action-token.entity';
import { MemberTypeOrmEntity } from '../../modules/iam/organizations/infrastructure/persistence/typeorm/entities/member.entity';
import { OrganizationInvitationTypeOrmEntity } from '../../modules/iam/organizations/infrastructure/persistence/typeorm/entities/organization-invitation.entity';
import { OrganizationTypeOrmEntity } from '../../modules/iam/organizations/infrastructure/persistence/typeorm/entities/organization.entity';
import { PermissionTypeOrmEntity } from '../../modules/iam/roles/infrastructure/persistence/typeorm/entities/permission.entity';
import { RoleTypeOrmEntity } from '../../modules/iam/roles/infrastructure/persistence/typeorm/entities/role.entity';
import { UserTypeOrmEntity } from '../../modules/iam/users/infrastructure/persistence/typeorm/entities/user.entity';
import { AuditLogTypeOrmEntity } from '../../modules/observability/audit-logs/infrastructure/persistence/typeorm/entities/audit-log.entity';
import { HttpLogTypeOrmEntity } from '../../modules/observability/http-logs/infrastructure/persistence/typeorm/entities/http-log.entity';

export const TYPEORM_ENTITIES = [
  UserTypeOrmEntity,
  AuthSessionTypeOrmEntity,
  UserActionTokenTypeOrmEntity,
  OrganizationTypeOrmEntity,
  MemberTypeOrmEntity,
  OrganizationInvitationTypeOrmEntity,
  RoleTypeOrmEntity,
  PermissionTypeOrmEntity,
  AuditLogTypeOrmEntity,
  HttpLogTypeOrmEntity,
];
