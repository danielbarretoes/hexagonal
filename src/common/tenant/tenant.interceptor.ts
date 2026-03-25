/**
 * Tenant interceptor.
 * Creates a request-scoped async context after authentication so repositories can safely resolve tenant data.
 */

import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContext, TenantInfo } from './tenant-context';

interface TenantAwareRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: {
    userId: string;
    email: string;
  };
}

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<TenantAwareRequest>();
    const organizationHeader = request.headers['x-organization-id'];
    const organizationId = typeof organizationHeader === 'string' ? organizationHeader : '';

    const tenant: TenantInfo | undefined = request.user
      ? {
          organizationId,
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
