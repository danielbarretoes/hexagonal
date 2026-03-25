/**
 * Trace Middleware
 * Generates or extracts trace ID for each request.
 * Sets trace ID in response headers for client tracking.
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TraceMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const traceId = (req.headers['x-trace-id'] as string) || randomUUID();

    req.headers['x-trace-id'] = traceId;
    res.setHeader('x-trace-id', traceId);

    next();
  }
}
