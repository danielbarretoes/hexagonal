/**
 * Trace Module
 * Global module for request tracing.
 * Provides trace ID generation and propagation.
 */

import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TraceMiddleware } from './trace.middleware';

@Module({})
export class TraceModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TraceMiddleware).forRoutes('*');
  }
}
