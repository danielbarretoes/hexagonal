import { Inject, Injectable } from '@nestjs/common';
import { SendMessageCommand, type SQSClient } from '@aws-sdk/client-sqs';
import type {
  AsyncJobTransportPort,
  PublishAsyncJobEnvelopeCommand,
} from '../../application/ports/async-job-transport.port';
import {
  JOBS_RUNTIME_OPTIONS,
  type JobsRuntimeOptions,
} from '../../application/ports/jobs-runtime-options.token';
import { SQS_CLIENT } from '../aws/sqs-client.token';

@Injectable()
export class SqsAsyncJobDispatcherAdapter implements AsyncJobTransportPort {
  constructor(
    @Inject(SQS_CLIENT)
    private readonly sqsClient: Pick<SQSClient, 'send'>,
    @Inject(JOBS_RUNTIME_OPTIONS)
    private readonly jobsRuntimeOptions: JobsRuntimeOptions,
  ) {}

  async publish<TPayload>(command: PublishAsyncJobEnvelopeCommand<TPayload>): Promise<void> {
    const isFifoQueue = this.jobsRuntimeOptions.sqsQueueUrl.endsWith('.fifo');

    await this.sqsClient.send(
      new SendMessageCommand({
        QueueUrl: this.jobsRuntimeOptions.sqsQueueUrl,
        MessageBody: JSON.stringify(command.envelope),
        MessageGroupId: isFifoQueue ? command.groupKey : undefined,
        MessageDeduplicationId: isFifoQueue ? command.deduplicationKey : undefined,
      }),
    );
  }
}
