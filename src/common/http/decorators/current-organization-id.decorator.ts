import { ForbiddenException, createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedHttpRequest } from '../authenticated-request';

export const CurrentOrganizationId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedHttpRequest>();

    if (!request.effectiveOrganizationId) {
      throw new ForbiddenException('Validated tenant context is required for this route');
    }

    return request.effectiveOrganizationId;
  },
);
