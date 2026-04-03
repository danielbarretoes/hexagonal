import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { writeStructuredLog } from '../../../../common/observability/logging/structured-log.util';
import { OutboxCleanupService } from '../../application/outbox-cleanup.service';
import {
  JOBS_RUNTIME_OPTIONS,
  type JobsRuntimeOptions,
} from '../../application/ports/jobs-runtime-options.token';

@Injectable()
export class OutboxCleanupWorker implements OnModuleDestroy {
  private running = true;

  constructor(
    private readonly outboxCleanupService: OutboxCleanupService,
    @Inject(JOBS_RUNTIME_OPTIONS)
    private readonly jobsRuntimeOptions: JobsRuntimeOptions,
  ) {}

  async start(): Promise<void> {
    if (!this.jobsRuntimeOptions.outboxCleanupEnabled) {
      writeStructuredLog('log', OutboxCleanupWorker.name, 'Outbox cleanup disabled', {
        event: 'jobs.outbox.cleanup.disabled',
      });
      return;
    }

    writeStructuredLog('log', OutboxCleanupWorker.name, 'Outbox cleanup started', {
      event: 'jobs.outbox.cleanup.started',
      batchSize: this.jobsRuntimeOptions.outboxCleanupBatchSize,
      intervalMs: this.jobsRuntimeOptions.outboxCleanupIntervalMs,
    });

    while (this.running) {
      try {
        const result = await this.outboxCleanupService.cleanupOnce();

        if (result.totalDeleted > 0) {
          writeStructuredLog('log', OutboxCleanupWorker.name, 'Outbox cleanup deleted rows', {
            event: 'jobs.outbox.cleanup.deleted',
            publishedDeleted: result.publishedDeleted,
            completedDeleted: result.completedDeleted,
            deadDeleted: result.deadDeleted,
            totalDeleted: result.totalDeleted,
          });
          continue;
        }
      } catch (error) {
        writeStructuredLog('error', OutboxCleanupWorker.name, 'Outbox cleanup failed', {
          event: 'jobs.outbox.cleanup.failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown cleanup error',
        });
      }

      await this.sleep(this.jobsRuntimeOptions.outboxCleanupIntervalMs);
    }

    writeStructuredLog('log', OutboxCleanupWorker.name, 'Outbox cleanup stopped', {
      event: 'jobs.outbox.cleanup.stopped',
    });
  }

  onModuleDestroy(): void {
    this.running = false;
  }

  private async sleep(durationMs: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, durationMs));
  }
}
