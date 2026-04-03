import { SendMessageCommand } from '@aws-sdk/client-sqs';
import { SqsAsyncJobDispatcherAdapter } from './sqs-async-job-dispatcher.adapter';

describe('SqsAsyncJobDispatcherAdapter', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('publishes FIFO envelopes with the provided message group and deduplication id', async () => {
    const send = jest.fn().mockResolvedValue(undefined);
    const adapter = new SqsAsyncJobDispatcherAdapter({ send } as never, {
      enabled: true,
      sqsRegion: 'us-east-1',
      sqsQueueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/hexagonal-jobs.fifo',
      maxMessages: 5,
      waitTimeSeconds: 10,
      visibilityTimeoutSeconds: 30,
      emailDeliveryMode: 'async',
      outboxBatchSize: 25,
      outboxPollIntervalMs: 1000,
      outboxClaimTimeoutMs: 60000,
      outboxCleanupEnabled: false,
      outboxCleanupBatchSize: 200,
      outboxCleanupIntervalMs: 900000,
      outboxMaxAttempts: 8,
      outboxRetryBaseMs: 1000,
      outboxRetryMaxMs: 60000,
      outboxRetentionPublishedHours: 720,
      outboxRetentionCompletedHours: 720,
      outboxRetentionDeadHours: 720,
    });

    await adapter.publish({
      envelope: {
        jobId: 'job-1',
        version: 1,
        type: 'transactional_email',
        payload: {
          type: 'welcome',
          to: 'owner@example.com',
          recipientName: 'Owner',
        },
        publishedAt: '2026-04-01T00:00:00.000Z',
        traceId: 'trace-1',
      },
      groupKey: 'transactional_email',
      deduplicationKey: 'dedupe-1',
    });

    expect(send).toHaveBeenCalledTimes(1);

    const command = send.mock.calls[0][0] as SendMessageCommand;

    expect(command.input).toEqual(
      expect.objectContaining({
        QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/hexagonal-jobs.fifo',
        MessageGroupId: 'transactional_email',
        MessageDeduplicationId: 'dedupe-1',
      }),
    );
    expect(command.input.MessageBody).toEqual(expect.stringContaining('"jobId":"job-1"'));
    expect(command.input.MessageBody).toEqual(
      expect.stringContaining('"type":"transactional_email"'),
    );
  });
});
