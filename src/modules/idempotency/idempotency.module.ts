import { Module } from '@nestjs/common';
import { IdempotencyAccessModule } from './idempotency-access.module';

@Module({
  imports: [IdempotencyAccessModule],
  exports: [IdempotencyAccessModule],
})
export class IdempotencyModule {}
