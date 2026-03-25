/**
 * Logging Interceptor
 * Provides request/response logging for observability.
 */

import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse<Response>();
          const { statusCode } = response;
          const duration = Date.now() - startTime;
          this.logger.log(`${method} ${url} ${statusCode} - ${duration}ms`);
        },
        error: (error: Error) => {
          const duration = Date.now() - startTime;
          this.logger.error(`${method} ${url} ERROR - ${duration}ms: ${error.message}`);
        },
      }),
    );
  }
}
