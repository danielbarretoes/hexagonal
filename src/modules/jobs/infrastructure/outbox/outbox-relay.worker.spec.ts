import { writeStructuredLog } from '../../../../common/observability/logging/structured-log.util';
import { OutboxRelayWorker } from './outbox-relay.worker';

jest.mock('../../../../common/observability/logging/structured-log.util', () => ({
  writeStructuredLog: jest.fn(),
}));

describe('OutboxRelayWorker', () => {
  const runtimeOptions = {
    enabled: true,
    sqsRegion: 'us-east-1',
    sqsQueueUrl: '',
    maxMessages: 5,
    waitTimeSeconds: 10,
    visibilityTimeoutSeconds: 30,
    emailDeliveryMode: 'async',
    outboxBatchSize: 25,
    outboxPollIntervalMs: 10,
    outboxClaimTimeoutMs: 60000,
    outboxMaxAttempts: 8,
    outboxRetryBaseMs: 1000,
    outboxRetryMaxMs: 60000,
    outboxCleanupEnabled: false,
    outboxCleanupBatchSize: 200,
    outboxCleanupIntervalMs: 900000,
    outboxRetentionPublishedHours: 720,
    outboxRetentionCompletedHours: 720,
    outboxRetentionDeadHours: 720,
  } as const;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns early when async jobs are disabled', async () => {
    const worker = new OutboxRelayWorker(
      {
        claimPendingBatch: jest.fn(),
        dispatchClaimedJob: jest.fn(),
      } as never,
      {
        ...runtimeOptions,
        enabled: false,
      },
    );

    await worker.start();

    expect(writeStructuredLog).toHaveBeenCalledWith(
      'log',
      OutboxRelayWorker.name,
      'Outbox relay disabled',
      expect.objectContaining({
        event: 'jobs.outbox.disabled',
      }),
    );
  });

  it('dispatches claimed jobs and stops cleanly when destroyed', async () => {
    const worker = new OutboxRelayWorker(
      {
        claimPendingBatch: jest.fn().mockResolvedValue(['job-1']),
        dispatchClaimedJob: jest.fn().mockImplementation(async () => {
          worker.onModuleDestroy();
        }),
      } as never,
      runtimeOptions,
    );

    await worker.start();

    expect(writeStructuredLog).toHaveBeenCalledWith(
      'log',
      OutboxRelayWorker.name,
      'Outbox relay started',
      expect.objectContaining({
        batchSize: 25,
      }),
    );
    expect(writeStructuredLog).toHaveBeenCalledWith(
      'log',
      OutboxRelayWorker.name,
      'Outbox relay stopped',
      expect.objectContaining({
        event: 'jobs.outbox.stopped',
      }),
    );
  });
});
