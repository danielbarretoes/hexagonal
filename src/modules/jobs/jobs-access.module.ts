import { Module } from '@nestjs/common';
import { SQSClient } from '@aws-sdk/client-sqs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getAppConfig } from '../../config/env/app-config';
import { ASYNC_JOB_DISPATCHER_PORT } from '../../shared/application/ports/async-job-dispatcher.token';
import { NoopAsyncJobDispatcherAdapter } from './infrastructure/adapters/noop-async-job-dispatcher.adapter';
import { OutboxAsyncJobDispatcherAdapter } from './infrastructure/adapters/outbox-async-job-dispatcher.adapter';
import { SqsAsyncJobDispatcherAdapter } from './infrastructure/adapters/sqs-async-job-dispatcher.adapter';
import { ASYNC_JOB_TRANSPORT_PORT } from './application/ports/async-job-transport.token';
import { JOB_EXECUTION_RECEIPT_REPOSITORY_TOKEN } from './application/ports/job-execution-receipt-repository.token';
import { JOB_OUTBOX_REPOSITORY_TOKEN } from './application/ports/job-outbox-repository.token';
import {
  JOBS_RUNTIME_OPTIONS,
  type JobsRuntimeOptions,
} from './application/ports/jobs-runtime-options.token';
import { JobExecutionReceiptTypeOrmEntity } from './infrastructure/persistence/typeorm/entities/job-execution-receipt.entity';
import { JobOutboxTypeOrmEntity } from './infrastructure/persistence/typeorm/entities/job-outbox.entity';
import { JobExecutionReceiptTypeOrmRepository } from './infrastructure/persistence/typeorm/repositories/job-execution-receipt.typeorm-repository';
import { JobOutboxTypeOrmRepository } from './infrastructure/persistence/typeorm/repositories/job-outbox.typeorm-repository';
import { SQS_CLIENT } from './infrastructure/aws/sqs-client.token';

@Module({
  imports: [TypeOrmModule.forFeature([JobOutboxTypeOrmEntity, JobExecutionReceiptTypeOrmEntity])],
  providers: [
    {
      provide: JOBS_RUNTIME_OPTIONS,
      useFactory: (): JobsRuntimeOptions => ({
        ...getAppConfig().jobs,
      }),
    },
    {
      provide: SQS_CLIENT,
      useFactory: (jobsRuntimeOptions: JobsRuntimeOptions) =>
        new SQSClient({ region: jobsRuntimeOptions.sqsRegion }),
      inject: [JOBS_RUNTIME_OPTIONS],
    },
    { provide: JOB_OUTBOX_REPOSITORY_TOKEN, useClass: JobOutboxTypeOrmRepository },
    {
      provide: JOB_EXECUTION_RECEIPT_REPOSITORY_TOKEN,
      useClass: JobExecutionReceiptTypeOrmRepository,
    },
    { provide: ASYNC_JOB_TRANSPORT_PORT, useClass: SqsAsyncJobDispatcherAdapter },
    JobOutboxTypeOrmRepository,
    JobExecutionReceiptTypeOrmRepository,
    NoopAsyncJobDispatcherAdapter,
    OutboxAsyncJobDispatcherAdapter,
    SqsAsyncJobDispatcherAdapter,
    {
      provide: ASYNC_JOB_DISPATCHER_PORT,
      useFactory: (
        jobsRuntimeOptions: JobsRuntimeOptions,
        noopAdapter: NoopAsyncJobDispatcherAdapter,
        outboxAdapter: OutboxAsyncJobDispatcherAdapter,
      ) => (jobsRuntimeOptions.enabled ? outboxAdapter : noopAdapter),
      inject: [
        JOBS_RUNTIME_OPTIONS,
        NoopAsyncJobDispatcherAdapter,
        OutboxAsyncJobDispatcherAdapter,
      ],
    },
  ],
  exports: [
    ASYNC_JOB_DISPATCHER_PORT,
    ASYNC_JOB_TRANSPORT_PORT,
    JOB_OUTBOX_REPOSITORY_TOKEN,
    JOB_EXECUTION_RECEIPT_REPOSITORY_TOKEN,
    JOBS_RUNTIME_OPTIONS,
    SQS_CLIENT,
  ],
})
export class JobsAccessModule {}
