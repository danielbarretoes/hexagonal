export { DomainException } from './domain.exception';
import { DomainException } from './domain.exception';

export class TenantContextRequiredException extends DomainException {
  constructor(resource: string) {
    super(`Tenant context is required to access ${resource}`, 'TENANT_CONTEXT_REQUIRED');
  }
}
