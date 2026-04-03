import { DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { NonRetryableJobError } from '../../application/errors/non-retryable-job.error';
import { SqsAsyncJobWorker } from './sqs-async-job.worker';

describe('SqsAsyncJobWorker', () => {
  const runtimeOptions = {
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
  } as const;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('deletes poison messages when the SQS envelope is malformed', async () => {
    const send = jest.fn().mockResolvedValue(undefined);
    const processEnvelope = jest.fn();
    const findById = jest.fn();
    const update = jest.fn();
    const worker = new SqsAsyncJobWorker(
      { send } as never,
      { process: processEnvelope } as never,
      { findById, update } as never,
      runtimeOptions,
    );

    await (
      worker as unknown as {
        processMessage: (message: Record<string, string>) => Promise<void>;
      }
    ).processMessage({
      Body: '{invalid-json',
      ReceiptHandle: 'receipt-1',
    });

    expect(processEnvelope).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toBeInstanceOf(DeleteMessageCommand);
    expect(findById).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('deletes poison messages when payload validation fails downstream as non-retryable', async () => {
    const send = jest.fn().mockResolvedValue(undefined);
    const processEnvelope = jest
      .fn()
      .mockRejectedValue(new NonRetryableJobError('Invalid transactional email payload'));
    const findById = jest.fn().mockResolvedValue(null);
    const update = jest.fn();
    const worker = new SqsAsyncJobWorker(
      { send } as never,
      { process: processEnvelope } as never,
      { findById, update } as never,
      runtimeOptions,
    );

    await (
      worker as unknown as {
        processMessage: (message: Record<string, string>) => Promise<void>;
      }
    ).processMessage({
      Body: JSON.stringify({
        version: 1,
        jobId: 'job-1',
        type: 'transactional_email',
        payload: { type: 'welcome' },
        publishedAt: '2026-04-02T08:00:00.000Z',
        traceId: null,
      }),
      ReceiptHandle: 'receipt-2',
    });

    expect(processEnvelope).toHaveBeenCalled();
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toBeInstanceOf(DeleteMessageCommand);
    expect(findById).toHaveBeenCalledWith('job-1');
    expect(update).not.toHaveBeenCalled();
  });
});
