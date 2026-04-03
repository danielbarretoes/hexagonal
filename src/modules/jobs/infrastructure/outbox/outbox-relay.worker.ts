import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { writeStructuredLog } from '../../../../common/observability/logging/structured-log.util';
import { OutboxRelayService } from '../../application/outbox-relay.service';
import {
  JOBS_RUNTIME_OPTIONS,
  type JobsRuntimeOptions,
} from '../../application/ports/jobs-runtime-options.token';

@Injectable()
export class OutboxRelayWorker implements OnModuleDestroy {
  private running = true;

  constructor(
    private readonly outboxRelayService: OutboxRelayService,
    @Inject(JOBS_RUNTIME_OPTIONS)
    private readonly jobsRuntimeOptions: JobsRuntimeOptions,
  ) {}

  async start(): Promise<void> {
    if (!this.jobsRuntimeOptions.enabled) {
      writeStructuredLog('log', OutboxRelayWorker.name, 'Outbox relay disabled', {
        event: 'jobs.outbox.disabled',
      });
      return;
    }

    writeStructuredLog('log', OutboxRelayWorker.name, 'Outbox relay started', {
      event: 'jobs.outbox.started',
      batchSize: this.jobsRuntimeOptions.outboxBatchSize,
      pollIntervalMs: this.jobsRuntimeOptions.outboxPollIntervalMs,
    });

    while (this.running) {
      const claimedJobIds = await this.outboxRelayService.claimPendingBatch(
        this.jobsRuntimeOptions.outboxBatchSize,
      );

      if (claimedJobIds.length === 0) {
        await this.sleep(this.jobsRuntimeOptions.outboxPollIntervalMs);
        continue;
      }

      for (const jobId of claimedJobIds) {
        if (!this.running) {
          break;
        }

        await this.outboxRelayService.dispatchClaimedJob(jobId);
      }
    }

    writeStructuredLog('log', OutboxRelayWorker.name, 'Outbox relay stopped', {
      event: 'jobs.outbox.stopped',
    });
  }

  onModuleDestroy(): void {
    this.running = false;
  }

  private async sleep(durationMs: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, durationMs));
  }
}
