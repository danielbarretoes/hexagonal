import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedHttpRequest } from '../authenticated-request';

export const CurrentOrganizationId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedHttpRequest>();

    if (request.effectiveOrganizationId) {
      return request.effectiveOrganizationId;
    }

    const organizationHeader = request.headers['x-organization-id'];
    return typeof organizationHeader === 'string' ? organizationHeader.trim() : undefined;
  },
);
