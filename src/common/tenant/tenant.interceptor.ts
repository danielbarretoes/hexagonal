/**
 * Tenant interceptor.
 * Creates a request-scoped async context after authentication so repositories can safely resolve tenant data.
 */

import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContext, TenantInfo } from './tenant-context';
import type { AuthenticatedUserPayload } from '../http/authenticated-request';
import { AUTHORIZATION_PORT } from '../../shared/application/ports/authorization.token';
import type { AuthorizationPort } from '../../shared/domain/ports/authorization.port';

interface TenantAwareRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: AuthenticatedUserPayload;
  effectiveOrganizationId?: string;
}

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(
    @Inject(AUTHORIZATION_PORT)
    private readonly authorizationPort: AuthorizationPort,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<TenantAwareRequest>();
    const organizationHeader = request.headers['x-organization-id'];
    const organizationId = typeof organizationHeader === 'string' ? organizationHeader : '';
    const normalizedOrganizationId = organizationId.trim();

    if (
      request.user &&
      normalizedOrganizationId &&
      request.effectiveOrganizationId !== normalizedOrganizationId
    ) {
      const hasAccess = await this.authorizationPort.hasTenantAccess(
        request.user.userId,
        normalizedOrganizationId,
      );

      if (!hasAccess) {
        throw new ForbiddenException('Invalid tenant context for authenticated user');
      }

      request.effectiveOrganizationId = normalizedOrganizationId;
    }

    const tenant: TenantInfo | undefined = request.user
      ? {
          organizationId: request.effectiveOrganizationId ?? '',
          userId: request.user.userId,
        }
      : undefined;

    return new Observable((subscriber) =>
      TenantContext.run(tenant, () => {
        const subscription = next.handle().subscribe({
          next: (value) => subscriber.next(value),
          error: (error: unknown) => subscriber.error(error),
          complete: () => subscriber.complete(),
        });

        return () => subscription.unsubscribe();
      }),
    );
  }
}
