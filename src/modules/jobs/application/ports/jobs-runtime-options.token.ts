export interface JobsRuntimeOptions {
  readonly enabled: boolean;
  readonly sqsRegion: string;
  readonly sqsQueueUrl: string;
  readonly maxMessages: number;
  readonly waitTimeSeconds: number;
  readonly visibilityTimeoutSeconds: number;
  readonly emailDeliveryMode: 'sync' | 'async';
  readonly outboxBatchSize: number;
  readonly outboxPollIntervalMs: number;
  readonly outboxClaimTimeoutMs: number;
  readonly outboxMaxAttempts: number;
  readonly outboxRetryBaseMs: number;
  readonly outboxRetryMaxMs: number;
  readonly outboxCleanupEnabled: boolean;
  readonly outboxCleanupBatchSize: number;
  readonly outboxCleanupIntervalMs: number;
  readonly outboxRetentionPublishedHours: number;
  readonly outboxRetentionCompletedHours: number;
  readonly outboxRetentionDeadHours: number;
}

export const JOBS_RUNTIME_OPTIONS = Symbol('JOBS_RUNTIME_OPTIONS');
