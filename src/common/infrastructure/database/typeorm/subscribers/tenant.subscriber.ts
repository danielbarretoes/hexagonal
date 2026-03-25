/**
 * Tenant Subscriber
 * TypeORM event subscriber that automatically sets organizationId on insert/update operations.
 * Ensures data isolation at the database level.
 * Registered in AppModule providers.
 */

import { EventSubscriber, EntitySubscriberInterface, InsertEvent, UpdateEvent } from 'typeorm';
import { TenantContext } from '../../../../tenant/tenant-context';

@EventSubscriber()
export class TenantSubscriber implements EntitySubscriberInterface {
  beforeInsert(event: InsertEvent<unknown>): void {
    const tenant = TenantContext.getTenant();
    if (!tenant || !tenant.organizationId) {
      return;
    }

    const entity = event.entity as Record<string, unknown>;

    if ('organizationId' in entity) {
      entity.organizationId = tenant.organizationId;
    }
  }

  beforeUpdate(event: UpdateEvent<unknown>): void {
    const tenant = TenantContext.getTenant();
    if (!tenant || !tenant.organizationId) {
      return;
    }

    const entity = event.entity as Record<string, unknown>;

    if ('organizationId' in entity) {
      entity.organizationId = tenant.organizationId;
    }
  }
}
