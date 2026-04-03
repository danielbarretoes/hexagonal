import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { initializeStructuredLoggingRuntime } from './common/observability/logging/logging-runtime';
import { writeStructuredLog } from './common/observability/logging/structured-log.util';
import { getAppConfig } from './config/env/app-config';
import { JobsRuntimeHealthService } from './modules/jobs/infrastructure/runtime/jobs-runtime-health.service';
import { WorkerModule } from './worker.module';

async function bootstrap(): Promise<void> {
  const config = getAppConfig();
  initializeStructuredLoggingRuntime({
    enabledLevels: config.logging.enabledLevels,
    json: config.logging.json,
    serviceName: config.logging.serviceName,
    environment: config.nodeEnv,
  });
  const logger = new ConsoleLogger('JobsDoctorBootstrap', {
    json: config.logging.json,
    logLevels: config.logging.enabledLevels,
  });
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
  });

  app.useLogger(logger);

  try {
    const jobsRuntimeHealthService = app.get(JobsRuntimeHealthService);
    const snapshot = await jobsRuntimeHealthService.getSnapshot();

    writeStructuredLog('log', 'JobsDoctorBootstrap', 'Worker runtime is ready', {
      event: 'jobs.runtime.doctor.ok',
      databaseReady: snapshot.databaseReady,
      outboxCounts: snapshot.outbox.counts,
      deadJobs: snapshot.outbox.deadJobs,
    });
  } finally {
    await app.close();
  }
}

if (require.main === module) {
  void bootstrap();
}
