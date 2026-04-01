/**
 * Application Bootstrap
 * Initializes the NestJS application with global middleware and pipes.
 */

import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { writeStructuredLog } from './common/observability/logging/structured-log.util';
import { AppModule } from './app.module';
import { configureHttpApplication } from './app.setup';
import { getAppConfig } from './config/env/app-config';
import { isSwaggerEnabled } from './config/swagger/swagger.config';

async function bootstrap(): Promise<void> {
  const config = getAppConfig();
  const logger = new ConsoleLogger('Bootstrap', {
    json: config.logging.json,
    logLevels: config.logging.enabledLevels,
  });
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(logger);
  app.enableShutdownHooks();
  configureHttpApplication(app);

  await app.listen(config.port);
  writeStructuredLog('log', 'Bootstrap', 'Application started', {
    event: 'application.started',
    port: config.port,
    database: config.database.database,
    logLevel: config.logging.level,
  });

  if (isSwaggerEnabled()) {
    writeStructuredLog('log', 'Bootstrap', 'Swagger enabled', {
      event: 'application.swagger.enabled',
      docsUrl: `http://localhost:${config.port}/docs`,
    });
  }
}

void bootstrap();
