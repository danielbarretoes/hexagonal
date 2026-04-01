import { SetMetadata } from '@nestjs/common';
import type { PermissionCode } from '../../../shared/domain/authorization/permission-codes';

export const REQUIRED_PERMISSIONS_METADATA_KEY = 'required_permissions';

export function RequirePermissions(...permissions: PermissionCode[]) {
  return SetMetadata(REQUIRED_PERMISSIONS_METADATA_KEY, permissions);
}
