import { writeStructuredLog } from '../../../../common/observability/logging/structured-log.util';
import { OutboxCleanupWorker } from './outbox-cleanup.worker';

jest.mock('../../../../common/observability/logging/structured-log.util', () => ({
  writeStructuredLog: jest.fn(),
}));

describe('OutboxCleanupWorker', () => {
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
    outboxCleanupEnabled: true,
    outboxCleanupBatchSize: 200,
    outboxCleanupIntervalMs: 10,
    outboxRetentionPublishedHours: 720,
    outboxRetentionCompletedHours: 720,
    outboxRetentionDeadHours: 720,
  } as const;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns early when cleanup is disabled', async () => {
    const worker = new OutboxCleanupWorker(
      {
        cleanupOnce: jest.fn(),
      } as never,
      {
        ...runtimeOptions,
        outboxCleanupEnabled: false,
      },
    );

    await worker.start();

    expect(writeStructuredLog).toHaveBeenCalledWith(
      'log',
      OutboxCleanupWorker.name,
      'Outbox cleanup disabled',
      expect.objectContaining({
        event: 'jobs.outbox.cleanup.disabled',
      }),
    );
  });

  it('logs deleted rows and stops when destroyed during a cleanup pass', async () => {
    const worker = new OutboxCleanupWorker(
      {
        cleanupOnce: jest.fn().mockImplementation(async () => {
          worker.onModuleDestroy();
          return {
            publishedDeleted: 1,
            completedDeleted: 0,
            deadDeleted: 0,
            totalDeleted: 1,
          };
        }),
      } as never,
      runtimeOptions,
    );

    await worker.start();

    expect(writeStructuredLog).toHaveBeenCalledWith(
      'log',
      OutboxCleanupWorker.name,
      'Outbox cleanup deleted rows',
      expect.objectContaining({
        totalDeleted: 1,
      }),
    );
    expect(writeStructuredLog).toHaveBeenCalledWith(
      'log',
      OutboxCleanupWorker.name,
      'Outbox cleanup stopped',
      expect.objectContaining({
        event: 'jobs.outbox.cleanup.stopped',
      }),
    );
  });

  it('logs cleanup failures and sleeps before retrying', async () => {
    const worker = new OutboxCleanupWorker(
      {
        cleanupOnce: jest.fn().mockRejectedValue(new Error('database unavailable')),
      } as never,
      runtimeOptions,
    );
    const sleepSpy = jest
      .spyOn(worker as never, 'sleep')
      .mockImplementation(async () => worker.onModuleDestroy());

    await worker.start();

    expect(writeStructuredLog).toHaveBeenCalledWith(
      'error',
      OutboxCleanupWorker.name,
      'Outbox cleanup failed',
      expect.objectContaining({
        errorMessage: 'database unavailable',
      }),
    );
    expect(sleepSpy).toHaveBeenCalledWith(10);
  });
});
