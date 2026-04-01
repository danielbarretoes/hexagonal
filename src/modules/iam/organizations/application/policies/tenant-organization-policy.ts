import { Injectable } from '@nestjs/common';
import { OrganizationScopeMismatchException } from '../../../shared/domain/exceptions';

@Injectable()
export class TenantOrganizationPolicy {
  assertMatchesScope(organizationId: string, scopedOrganizationId: string): void {
    if (organizationId !== scopedOrganizationId) {
      throw new OrganizationScopeMismatchException(organizationId, scopedOrganizationId);
    }
  }
}
