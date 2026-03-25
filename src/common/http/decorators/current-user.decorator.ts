/**
 * Current User Decorator
 * Extracts user data from the authenticated request.
 */

import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

interface UserPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      return undefined;
    }

    return data ? user[data as keyof UserPayload] : user;
  },
);
