import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import type { HttpLogRequest } from '../../../../../common/http/http-log-context';
import { writeStructuredLog } from '../../../../../common/observability/logging/structured-log.util';
import { HttpLogWriteDrain } from '../../application/http-log-write-drain';
import { RecordHttpLogUseCase } from '../../application/use-cases/record-http-log.use-case';
import {
  sanitizeHttpLogErrorStack,
  sanitizeHttpLogPayload,
} from '../../infrastructure/serialization/http-log.serializer';

type JsonResponder = (body?: unknown) => Response;
type SendResponder = (body?: unknown) => Response;

@Injectable()
export class HttpLogsMiddleware implements NestMiddleware {
  constructor(private readonly recordHttpLogUseCase: RecordHttpLogUseCase) {}

  use(request: HttpLogRequest, response: Response, next: NextFunction): void {
    const startTime = Date.now();
    let responseBody: unknown;

    this.captureResponseBody(response, (body) => {
      responseBody = body;
    });

    response.once('finish', () => {
      const durationMs = Date.now() - startTime;
      const statusCode = response.statusCode;
      const traceId =
        typeof request.headers['x-trace-id'] === 'string' ? request.headers['x-trace-id'] : null;

      const logCommand = {
        method: request.method,
        path: request.path,
        statusCode,
        requestBody: sanitizeHttpLogPayload(request.body),
        queryParams: sanitizeHttpLogPayload(request.query),
        routeParams: sanitizeHttpLogPayload(request.params),
        responseBody: sanitizeHttpLogPayload(responseBody),
        errorMessage: request.httpLogError?.message ?? null,
        errorTrace: sanitizeHttpLogErrorStack(request.httpLogError?.stack ?? undefined),
        durationMs,
        userId: request.user?.userId ?? null,
        organizationId: request.effectiveOrganizationId ?? null,
        traceId,
      } as const;

      const pendingWrite = this.recordHttpLogUseCase
        .execute(logCommand)
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : 'Unknown persistence error';
          writeStructuredLog('error', HttpLogsMiddleware.name, 'Failed to persist HTTP log', {
            event: 'http_log.persist.failed',
            errorMessage: message,
            traceId,
          });
        })
        .finally(() => {
          HttpLogWriteDrain.resolve(pendingWrite);
        });

      HttpLogWriteDrain.track(pendingWrite);

      if (statusCode >= 400) {
        writeStructuredLog('error', HttpLogsMiddleware.name, 'HTTP request completed with error', {
          event: 'http.request.completed',
          traceId,
          method: request.method,
          path: request.path,
          statusCode,
          durationMs,
          userId: request.user?.userId ?? null,
          organizationId: request.effectiveOrganizationId ?? null,
          errorMessage: logCommand.errorMessage,
        });
        return;
      }

      writeStructuredLog('log', HttpLogsMiddleware.name, 'HTTP request completed', {
        event: 'http.request.completed',
        traceId,
        method: request.method,
        path: request.path,
        statusCode,
        durationMs,
        userId: request.user?.userId ?? null,
        organizationId: request.effectiveOrganizationId ?? null,
      });
    });

    next();
  }

  static async waitForIdle(): Promise<void> {
    await HttpLogWriteDrain.waitForIdle();
  }

  private captureResponseBody(response: Response, onBody: (body: unknown) => void): void {
    const originalJson = response.json.bind(response) as JsonResponder;
    const originalSend = response.send.bind(response) as SendResponder;

    response.json = ((body?: unknown) => {
      onBody(body);
      return originalJson(body);
    }) as Response['json'];

    response.send = ((body?: unknown) => {
      onBody(body);
      return originalSend(body);
    }) as Response['send'];
  }
}
